import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings
from app.domain.entities import Candidate, Election, ElectionStatus, OtpSession, Vote, Voter
from app.domain.interfaces import (
    ICandidateRepository,
    IElectionRepository,
    IExcelImporter,
    INotificationService,
    IOtpRepository,
    IVoteRepository,
    IVoterRepository,
)


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return email
    if len(local) <= 2:
        masked_local = f"{local[0]}***"
    else:
        masked_local = f"{local[0]}***{local[-1]}"
    return f"{masked_local}@{domain}"


class VoterImportService:
    def __init__(
        self,
        voter_repo: IVoterRepository,
        excel_importer: IExcelImporter,
    ) -> None:
        self._voter_repo = voter_repo
        self._excel_importer = excel_importer

    async def import_from_excel(self, file_content: bytes) -> tuple[list[Voter], list[str]]:
        voters = await self._excel_importer.parse_voters(file_content)
        created: list[Voter] = []
        skipped: list[str] = []

        for voter in voters:
            existing = await self._voter_repo.get_by_email(voter.email)
            if existing:
                skipped.append(f"{voter.email} déjà enregistré")
                continue
            phone_exists = await self._voter_repo.get_by_phone(voter.phone)
            if phone_exists:
                skipped.append(f"{voter.phone} déjà enregistré")
                continue
            created.extend(await self._voter_repo.create_many([voter]))

        return created, skipped


class CandidateService:
    def __init__(self, candidate_repo: ICandidateRepository) -> None:
        self._candidate_repo = candidate_repo

    async def create(self, candidate: Candidate) -> Candidate:
        return await self._candidate_repo.create(candidate)

    async def get_by_id(self, candidate_id: int) -> Candidate | None:
        return await self._candidate_repo.get_by_id(candidate_id)

    async def update_photo(self, candidate_id: int, photo_url: str) -> Candidate:
        return await self._candidate_repo.update_photo(candidate_id, photo_url)

    async def list_by_election(self, election_id: int) -> list[Candidate]:
        return await self._candidate_repo.list_by_election(election_id)

    async def delete(self, candidate_id: int) -> None:
        await self._candidate_repo.delete(candidate_id)


class ElectionService:
    def __init__(
        self,
        election_repo: IElectionRepository,
        candidate_repo: ICandidateRepository,
    ) -> None:
        self._election_repo = election_repo
        self._candidate_repo = candidate_repo

    @staticmethod
    def _normalize_utc(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    @staticmethod
    def _validate_schedule(starts_at: datetime | None, ends_at: datetime | None) -> None:
        starts_at = ElectionService._normalize_utc(starts_at)
        ends_at = ElectionService._normalize_utc(ends_at)
        if starts_at is None or ends_at is None:
            raise ValueError("Les dates d'ouverture et de fermeture sont requises")
        if ends_at <= starts_at:
            raise ValueError("La date de fermeture doit être postérieure à l'ouverture")

    async def create(
        self,
        title: str,
        description: str | None,
        starts_at: datetime,
        ends_at: datetime,
    ) -> Election:
        starts_at = self._normalize_utc(starts_at)
        ends_at = self._normalize_utc(ends_at)
        self._validate_schedule(starts_at, ends_at)
        election = Election(
            id=None,
            title=title,
            description=description,
            status=ElectionStatus.DRAFT,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        return await self._election_repo.create(election)

    @staticmethod
    def _same_schedule_moment(a: datetime | None, b: datetime | None) -> bool:
        if a is None and b is None:
            return True
        if a is None or b is None:
            return False
        a_norm = ElectionService._normalize_utc(a).replace(second=0, microsecond=0)
        b_norm = ElectionService._normalize_utc(b).replace(second=0, microsecond=0)
        return a_norm == b_norm

    async def update(
        self,
        election_id: int,
        *,
        title: str | None = None,
        description: str | None = None,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
    ) -> Election:
        election = await self._election_repo.get_by_id(election_id)
        if not election:
            raise ValueError("Élection introuvable")
        if election.status == ElectionStatus.CLOSED:
            raise ValueError("Impossible de modifier une élection clôturée")

        if title is not None:
            election.title = title
        if description is not None:
            election.description = description

        if starts_at is not None:
            starts_at = self._normalize_utc(starts_at)
        if ends_at is not None:
            ends_at = self._normalize_utc(ends_at)

        if election.status == ElectionStatus.ACTIVE and starts_at is not None and election.starts_at:
            if not self._same_schedule_moment(starts_at, election.starts_at):
                raise ValueError("La date d'ouverture ne peut plus être modifiée pendant le scrutin")
            starts_at = None

        if starts_at is not None:
            election.starts_at = starts_at
        if ends_at is not None:
            election.ends_at = ends_at

        self._validate_schedule(election.starts_at, election.ends_at)
        return await self._election_repo.update(election)

    async def close_expired_elections(self) -> int:
        now = datetime.utcnow()
        closed = 0
        for election in await self._election_repo.list_all():
            if (
                election.status == ElectionStatus.ACTIVE
                and election.ends_at
                and election.ends_at <= now
            ):
                election.status = ElectionStatus.CLOSED
                await self._election_repo.update(election)
                closed += 1
        return closed

    async def activate(self, election_id: int) -> Election:
        election = await self._election_repo.get_by_id(election_id)
        if not election:
            raise ValueError("Élection introuvable")
        candidates = await self._candidate_repo.list_by_election(election_id)
        if len(candidates) < 2:
            raise ValueError("Au moins 2 candidats requis pour ouvrir le vote")
        self._validate_schedule(election.starts_at, election.ends_at)
        now = datetime.utcnow()
        if election.ends_at and election.ends_at <= now:
            raise ValueError("La date de fermeture est déjà passée")
        election.status = ElectionStatus.ACTIVE
        return await self._election_repo.update(election)

    async def close(self, election_id: int) -> Election:
        election = await self._election_repo.get_by_id(election_id)
        if not election:
            raise ValueError("Élection introuvable")
        election.status = ElectionStatus.CLOSED
        if not election.ends_at or election.ends_at > datetime.utcnow():
            election.ends_at = datetime.utcnow()
        return await self._election_repo.update(election)

    async def list_all(self) -> list[Election]:
        return await self._election_repo.list_all()

    async def get(self, election_id: int) -> Election | None:
        return await self._election_repo.get_by_id(election_id)

    async def get_published_election(self) -> Election | None:
        return await self._election_repo.get_published()

    async def set_results_published(self, election_id: int, published: bool) -> Election:
        election = await self._election_repo.get_by_id(election_id)
        if not election:
            raise ValueError("Élection introuvable")
        if election.status == ElectionStatus.DRAFT:
            raise ValueError("Publiez d'abord l'élection (ouvrez ou clôturez le scrutin)")
        return await self._election_repo.set_results_published(election_id, published)


class AuthService:
    def __init__(
        self,
        voter_repo: IVoterRepository,
        otp_repo: IOtpRepository,
        notification: INotificationService,
    ) -> None:
        self._voter_repo = voter_repo
        self._otp_repo = otp_repo
        self._notification = notification

    async def request_otp(self, identifier: str) -> tuple[str, str]:
        voter = await self._voter_repo.get_by_email(identifier.lower())
        if not voter:
            voter = await self._voter_repo.get_by_phone(identifier)
        if not voter or not voter.is_active:
            raise ValueError("Électeur non autorisé")

        code = f"{secrets.randbelow(1_000_000):06d}"
        await self._otp_repo.invalidate_previous(voter.id)
        session = OtpSession(
            id=None,
            voter_id=voter.id,
            code=code,
            expires_at=datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes),
        )
        await self._otp_repo.create(session)
        await self._notification.send_otp_email(voter.email, code)
        return _mask_email(voter.email), code

    async def verify_otp(self, identifier: str, code: str) -> tuple[str, Voter]:
        voter = await self._voter_repo.get_by_email(identifier.lower())
        if not voter:
            voter = await self._voter_repo.get_by_phone(identifier)
        if not voter:
            raise ValueError("Électeur non autorisé")

        session = await self._otp_repo.get_valid(voter.id, code)
        if not session:
            raise ValueError("Code OTP invalide ou expiré")

        await self._otp_repo.mark_verified(session.id)
        token = self._create_voter_token(voter.id)
        return token, voter

    def _create_voter_token(self, voter_id: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        payload = {"sub": str(voter_id), "type": "voter", "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    def decode_voter_token(self, token: str) -> int:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("type") != "voter":
                raise ValueError("Token invalide")
            return int(payload["sub"])
        except (JWTError, KeyError, ValueError) as exc:
            raise ValueError("Token invalide") from exc

    def verify_admin(self, username: str, password: str) -> str:
        if username != settings.admin_username or password != settings.admin_password:
            raise ValueError("Identifiants admin invalides")

        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        payload = {"sub": username, "type": "admin", "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    def decode_admin_token(self, token: str) -> str:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("type") != "admin":
                raise ValueError("Token invalide")
            return payload["sub"]
        except (JWTError, KeyError, ValueError) as exc:
            raise ValueError("Token invalide") from exc


class VoteService:
    def __init__(
        self,
        vote_repo: IVoteRepository,
        voter_repo: IVoterRepository,
        election_repo: IElectionRepository,
        candidate_repo: ICandidateRepository,
    ) -> None:
        self._vote_repo = vote_repo
        self._voter_repo = voter_repo
        self._election_repo = election_repo
        self._candidate_repo = candidate_repo

    async def cast_vote(self, voter_id: int, election_id: int, candidate_id: int) -> Vote:
        election = await self._election_repo.get_by_id(election_id)
        if not election or election.status != ElectionStatus.ACTIVE:
            raise ValueError("Le vote n'est pas ouvert")

        now = datetime.utcnow()
        if election.starts_at and now < election.starts_at:
            raise ValueError("Le vote n'est pas encore ouvert")
        if election.ends_at and now >= election.ends_at:
            raise ValueError("Le vote est clôturé")

        voter = await self._voter_repo.get_by_id(voter_id)
        if not voter or not voter.is_active:
            raise ValueError("Électeur non autorisé")

        if await self._vote_repo.has_voted(voter_id, election_id):
            raise ValueError("Vous avez déjà voté pour cette élection")

        candidate = await self._candidate_repo.get_by_id(candidate_id)
        if not candidate or candidate.election_id != election_id:
            raise ValueError("Candidat invalide")

        vote = Vote(
            id=None,
            election_id=election_id,
            candidate_id=candidate_id,
            voter_id=voter_id,
            cast_at=datetime.utcnow(),
        )
        created = await self._vote_repo.create(vote)
        await self._voter_repo.mark_as_voted(voter_id)
        return created

    async def get_results(self, election_id: int) -> dict[int, int]:
        election = await self._election_repo.get_by_id(election_id)
        if not election:
            raise ValueError("Élection introuvable")
        if election.status not in (ElectionStatus.ACTIVE, ElectionStatus.CLOSED):
            raise ValueError("Aucun résultat disponible pour cette élection")
        return await self._vote_repo.count_by_candidate(election_id)

    async def get_live_dashboard(self) -> dict:
        elections = await self._election_repo.list_all()
        published = await self._election_repo.get_published()
        now = datetime.utcnow()
        dashboards: list[dict] = []

        total_electors = await self._voter_repo.count_active()

        if published:
            voted_count = await self._vote_repo.count_for_election(published.id)
        else:
            active = [e for e in elections if e.status == ElectionStatus.ACTIVE]
            if active:
                voted_count = 0
                for election in active:
                    voted_count += await self._vote_repo.count_for_election(election.id)
            else:
                voters = await self._voter_repo.list_all()
                voted_count = sum(1 for v in voters if v.is_active and v.has_voted)

        pending_count = max(total_electors - voted_count, 0)
        participation_rate = round((voted_count / total_electors * 100) if total_electors else 0.0, 1)

        if published:
            candidates = await self._candidate_repo.list_by_election(published.id)
            counts = await self._vote_repo.count_by_candidate(published.id)
            total = sum(counts.values())

            candidate_stats = []
            for candidate in candidates:
                votes = counts.get(candidate.id, 0)
                percentage = round((votes / total * 100) if total else 0.0, 1)
                candidate_stats.append(
                    {
                        "id": candidate.id,
                        "first_name": candidate.first_name,
                        "last_name": candidate.last_name,
                        "position": candidate.position,
                        "description": candidate.description,
                        "photo_url": candidate.photo_url,
                        "votes": votes,
                        "percentage": percentage,
                    }
                )

            candidate_stats.sort(key=lambda c: c["votes"], reverse=True)

            dashboards.append(
                {
                    "election_id": published.id,
                    "title": published.title,
                    "description": published.description,
                    "status": published.status.value,
                    "starts_at": published.starts_at,
                    "ends_at": published.ends_at,
                    "total_votes": total,
                    "candidates": candidate_stats,
                    "updated_at": now,
                }
            )

        return {
            "voter_stats": {
                "total_electors": total_electors,
                "voted_count": voted_count,
                "pending_count": pending_count,
                "participation_rate": participation_rate,
            },
            "elections": dashboards,
        }
