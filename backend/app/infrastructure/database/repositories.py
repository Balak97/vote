from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Candidate, Election, ElectionStatus, Feedback, OtpSession, Vote, Voter
from app.domain.interfaces import (
    ICandidateRepository,
    IElectionRepository,
    IFeedbackRepository,
    IOtpRepository,
    IVoteRepository,
    IVoterRepository,
)
from app.infrastructure.database.models import (
    CandidateModel,
    ElectionModel,
    FeedbackModel,
    OtpSessionModel,
    VoteModel,
    VoterModel,
)


def _to_voter(model: VoterModel) -> Voter:
    return Voter(
        id=model.id,
        email=model.email,
        phone=model.phone,
        last_name=model.last_name,
        first_name=model.first_name,
        has_voted=model.has_voted,
        is_active=model.is_active,
    )


def _to_candidate(model: CandidateModel) -> Candidate:
    return Candidate(
        id=model.id,
        election_id=model.election_id,
        last_name=model.last_name,
        first_name=model.first_name,
        description=model.description,
        position=model.position,
        photo_url=model.photo_url,
    )


def _to_election(model: ElectionModel) -> Election:
    return Election(
        id=model.id,
        title=model.title,
        description=model.description,
        status=ElectionStatus(model.status),
        starts_at=model.starts_at,
        ends_at=model.ends_at,
        results_published=model.results_published,
    )


class SqlAlchemyVoterRepository(IVoterRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, voter_id: int) -> Voter | None:
        result = await self._session.get(VoterModel, voter_id)
        return _to_voter(result) if result else None

    async def get_by_email(self, email: str) -> Voter | None:
        stmt = select(VoterModel).where(VoterModel.email == email.lower())
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_voter(result) if result else None

    async def get_by_phone(self, phone: str) -> Voter | None:
        stmt = select(VoterModel).where(VoterModel.phone == phone)
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_voter(result) if result else None

    async def list_all(self) -> list[Voter]:
        stmt = select(VoterModel).order_by(VoterModel.last_name, VoterModel.first_name)
        results = (await self._session.execute(stmt)).scalars().all()
        return [_to_voter(v) for v in results]

    async def count_active(self) -> int:
        stmt = select(func.count()).select_from(VoterModel).where(VoterModel.is_active.is_(True))
        return (await self._session.execute(stmt)).scalar_one()

    async def create_many(self, voters: list[Voter]) -> list[Voter]:
        created: list[Voter] = []
        for voter in voters:
            model = VoterModel(
                email=voter.email.lower(),
                phone=voter.phone,
                last_name=voter.last_name,
                first_name=voter.first_name,
            )
            self._session.add(model)
            await self._session.flush()
            created.append(_to_voter(model))
        return created

    async def mark_as_voted(self, voter_id: int) -> None:
        model = await self._session.get(VoterModel, voter_id)
        if model:
            model.has_voted = True

    async def update(self, voter: Voter) -> Voter:
        model = await self._session.get(VoterModel, voter.id)
        if not model:
            raise ValueError("Électeur introuvable")
        model.email = voter.email.lower()
        model.phone = voter.phone
        model.last_name = voter.last_name
        model.first_name = voter.first_name
        model.is_active = voter.is_active
        await self._session.flush()
        return _to_voter(model)

    async def delete(self, voter_id: int) -> None:
        model = await self._session.get(VoterModel, voter_id)
        if not model:
            raise ValueError("Électeur introuvable")
        await self._session.delete(model)


class SqlAlchemyCandidateRepository(ICandidateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, candidate_id: int) -> Candidate | None:
        result = await self._session.get(CandidateModel, candidate_id)
        return _to_candidate(result) if result else None

    async def list_by_election(self, election_id: int) -> list[Candidate]:
        stmt = (
            select(CandidateModel)
            .where(CandidateModel.election_id == election_id)
            .order_by(CandidateModel.last_name, CandidateModel.first_name)
        )
        results = (await self._session.execute(stmt)).scalars().all()
        return [_to_candidate(c) for c in results]

    async def create(self, candidate: Candidate) -> Candidate:
        model = CandidateModel(
            election_id=candidate.election_id,
            last_name=candidate.last_name,
            first_name=candidate.first_name,
            description=candidate.description,
            position=candidate.position,
            photo_url=candidate.photo_url,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_candidate(model)

    async def update_photo(self, candidate_id: int, photo_url: str) -> Candidate:
        model = await self._session.get(CandidateModel, candidate_id)
        if not model:
            raise ValueError("Candidat introuvable")
        model.photo_url = photo_url
        await self._session.flush()
        return _to_candidate(model)

    async def delete(self, candidate_id: int) -> None:
        model = await self._session.get(CandidateModel, candidate_id)
        if model:
            await self._session.delete(model)


class SqlAlchemyElectionRepository(IElectionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, election_id: int) -> Election | None:
        result = await self._session.get(ElectionModel, election_id)
        return _to_election(result) if result else None

    async def list_all(self) -> list[Election]:
        stmt = select(ElectionModel).order_by(ElectionModel.id.desc())
        results = (await self._session.execute(stmt)).scalars().all()
        return [_to_election(e) for e in results]

    async def create(self, election: Election) -> Election:
        model = ElectionModel(
            title=election.title,
            description=election.description,
            status=election.status.value,
            starts_at=election.starts_at,
            ends_at=election.ends_at,
            results_published=election.results_published,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_election(model)

    async def update(self, election: Election) -> Election:
        model = await self._session.get(ElectionModel, election.id)
        if not model:
            raise ValueError("Élection introuvable")
        model.title = election.title
        model.description = election.description
        model.status = election.status.value
        model.starts_at = election.starts_at
        model.ends_at = election.ends_at
        model.results_published = election.results_published
        await self._session.flush()
        return _to_election(model)

    async def get_published(self) -> Election | None:
        stmt = select(ElectionModel).where(ElectionModel.results_published.is_(True))
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_election(result) if result else None

    async def set_results_published(self, election_id: int, published: bool) -> Election:
        if published:
            await self._session.execute(
                update(ElectionModel).values(results_published=False),
            )
        model = await self._session.get(ElectionModel, election_id)
        if not model:
            raise ValueError("Élection introuvable")
        model.results_published = published
        await self._session.flush()
        return _to_election(model)


class SqlAlchemyVoteRepository(IVoteRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def has_voted(self, voter_id: int, election_id: int) -> bool:
        stmt = select(VoteModel.id).where(
            VoteModel.voter_id == voter_id,
            VoteModel.election_id == election_id,
        )
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return result is not None

    async def create(self, vote: Vote) -> Vote:
        model = VoteModel(
            election_id=vote.election_id,
            candidate_id=vote.candidate_id,
            voter_id=vote.voter_id,
            cast_at=vote.cast_at or datetime.utcnow(),
        )
        self._session.add(model)
        await self._session.flush()
        return Vote(
            id=model.id,
            election_id=model.election_id,
            candidate_id=model.candidate_id,
            voter_id=model.voter_id,
            cast_at=model.cast_at,
        )

    async def count_by_candidate(self, election_id: int) -> dict[int, int]:
        stmt = (
            select(VoteModel.candidate_id, func.count(VoteModel.id))
            .where(VoteModel.election_id == election_id)
            .group_by(VoteModel.candidate_id)
        )
        rows = (await self._session.execute(stmt)).all()
        return {candidate_id: count for candidate_id, count in rows}

    async def count_for_election(self, election_id: int) -> int:
        stmt = select(func.count()).select_from(VoteModel).where(VoteModel.election_id == election_id)
        return (await self._session.execute(stmt)).scalar_one()

    async def delete_by_voter(self, voter_id: int) -> None:
        await self._session.execute(delete(VoteModel).where(VoteModel.voter_id == voter_id))


class SqlAlchemyOtpRepository(IOtpRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, session: OtpSession) -> OtpSession:
        model = OtpSessionModel(
            voter_id=session.voter_id,
            code=session.code,
            expires_at=session.expires_at,
        )
        self._session.add(model)
        await self._session.flush()
        return OtpSession(
            id=model.id,
            voter_id=model.voter_id,
            code=model.code,
            expires_at=model.expires_at,
        )

    async def get_valid(self, voter_id: int, code: str) -> OtpSession | None:
        stmt = select(OtpSessionModel).where(
            OtpSessionModel.voter_id == voter_id,
            OtpSessionModel.code == code,
            OtpSessionModel.verified.is_(False),
            OtpSessionModel.expires_at > datetime.utcnow(),
        )
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        if not result:
            return None
        return OtpSession(
            id=result.id,
            voter_id=result.voter_id,
            code=result.code,
            expires_at=result.expires_at,
            verified=result.verified,
        )

    async def mark_verified(self, session_id: int) -> None:
        model = await self._session.get(OtpSessionModel, session_id)
        if model:
            model.verified = True

    async def invalidate_previous(self, voter_id: int) -> None:
        stmt = select(OtpSessionModel).where(
            OtpSessionModel.voter_id == voter_id,
            OtpSessionModel.verified.is_(False),
        )
        sessions = (await self._session.execute(stmt)).scalars().all()
        for s in sessions:
            s.expires_at = datetime.utcnow()

    async def delete_by_voter(self, voter_id: int) -> None:
        await self._session.execute(delete(OtpSessionModel).where(OtpSessionModel.voter_id == voter_id))


class SqlAlchemyFeedbackRepository(IFeedbackRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, feedback: Feedback) -> Feedback:
        model = FeedbackModel(
            email=feedback.email.lower(),
            phone=feedback.phone,
            message=feedback.message,
            created_at=feedback.created_at or datetime.utcnow(),
        )
        self._session.add(model)
        await self._session.flush()
        return Feedback(
            id=model.id,
            email=model.email,
            phone=model.phone,
            message=model.message,
            created_at=model.created_at,
        )
