from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.repositories import (
    SqlAlchemyCandidateRepository,
    SqlAlchemyElectionRepository,
    SqlAlchemyFeedbackRepository,
    SqlAlchemyOtpRepository,
    SqlAlchemyVoteRepository,
    SqlAlchemyVoterRepository,
)
from app.infrastructure.database.session import get_session
from app.services.rate_limit import RateLimitService
from app.infrastructure.excel.importer import ExcelVoterImporter
from app.infrastructure.notifications.factory import get_notification_service
from app.services import (
    AuthService,
    CandidateService,
    ElectionService,
    FeedbackService,
    VoteService,
    VoterImportService,
    VoterService,
)

security = HTTPBearer(auto_error=False)


def get_voter_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyVoterRepository:
    return SqlAlchemyVoterRepository(session)


def get_candidate_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyCandidateRepository:
    return SqlAlchemyCandidateRepository(session)


def get_election_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyElectionRepository:
    return SqlAlchemyElectionRepository(session)


def get_vote_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyVoteRepository:
    return SqlAlchemyVoteRepository(session)


def get_otp_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyOtpRepository:
    return SqlAlchemyOtpRepository(session)


def get_auth_service(
    voter_repo: Annotated[SqlAlchemyVoterRepository, Depends(get_voter_repo)],
    otp_repo: Annotated[SqlAlchemyOtpRepository, Depends(get_otp_repo)],
) -> AuthService:
    return AuthService(voter_repo, otp_repo, get_notification_service())


def get_voter_import_service(
    voter_repo: Annotated[SqlAlchemyVoterRepository, Depends(get_voter_repo)],
) -> VoterImportService:
    return VoterImportService(voter_repo, ExcelVoterImporter())


def get_feedback_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> SqlAlchemyFeedbackRepository:
    return SqlAlchemyFeedbackRepository(session)


def get_voter_service(
    voter_repo: Annotated[SqlAlchemyVoterRepository, Depends(get_voter_repo)],
    vote_repo: Annotated[SqlAlchemyVoteRepository, Depends(get_vote_repo)],
    otp_repo: Annotated[SqlAlchemyOtpRepository, Depends(get_otp_repo)],
) -> VoterService:
    return VoterService(voter_repo, vote_repo, otp_repo, get_notification_service())


def get_feedback_service(
    feedback_repo: Annotated[SqlAlchemyFeedbackRepository, Depends(get_feedback_repo)],
) -> FeedbackService:
    return FeedbackService(feedback_repo, get_notification_service())


def get_rate_limit_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RateLimitService:
    return RateLimitService(session)


def get_candidate_service(
    candidate_repo: Annotated[SqlAlchemyCandidateRepository, Depends(get_candidate_repo)],
) -> CandidateService:
    return CandidateService(candidate_repo)


def get_election_service(
    election_repo: Annotated[SqlAlchemyElectionRepository, Depends(get_election_repo)],
    candidate_repo: Annotated[SqlAlchemyCandidateRepository, Depends(get_candidate_repo)],
) -> ElectionService:
    return ElectionService(election_repo, candidate_repo)


def get_vote_service(
    vote_repo: Annotated[SqlAlchemyVoteRepository, Depends(get_vote_repo)],
    voter_repo: Annotated[SqlAlchemyVoterRepository, Depends(get_voter_repo)],
    election_repo: Annotated[SqlAlchemyElectionRepository, Depends(get_election_repo)],
    candidate_repo: Annotated[SqlAlchemyCandidateRepository, Depends(get_candidate_repo)],
) -> VoteService:
    return VoteService(vote_repo, voter_repo, election_repo, candidate_repo)


async def get_current_voter_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> int:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise")
    try:
        return auth_service.decode_voter_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification admin requise")
    try:
        return auth_service.decode_admin_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
