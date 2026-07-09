from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_auth_service,
    get_candidate_service,
    get_current_voter_id,
    get_election_service,
    get_feedback_service,
    get_vote_service,
    get_voter_repo,
    get_voter_service,
)
from app.api.schemas import (
    CandidateResponse,
    CastVoteRequest,
    ElectionResponse,
    ElectionLiveDashboard,
    FeedbackRequest,
    FeedbackResponse,
    LiveDashboardResponse,
    OtpRequest,
    OtpSentResponse,
    OtpVerifyRequest,
    RegistrationCheckRequest,
    RegistrationCheckResponse,
    ResultsResponse,
    TokenResponse,
    VoteResponse,
    VoterResponse,
)
from app.config import settings
from app.domain.entities import ElectionStatus
from app.domain.interfaces import IVoterRepository
from app.infrastructure.database.session import get_session
from app.services import AuthService, CandidateService, ElectionService, FeedbackService, VoteService, VoterService

router = APIRouter(prefix="/vote", tags=["vote"])


async def _close_expired_elections(
    election_service: ElectionService,
    session: AsyncSession,
) -> None:
    await election_service.close_expired_elections()
    await session.commit()


async def _build_results_response(
    election_id: int,
    vote_service: VoteService,
    candidate_service: CandidateService,
    election_service: ElectionService,
) -> ResultsResponse:
    election = await election_service.get(election_id)
    if not election:
        raise ValueError("Élection introuvable")
    results = await vote_service.get_results(election_id)
    candidates = await candidate_service.list_by_election(election_id)
    return ResultsResponse(
        election_id=election_id,
        title=election.title,
        status=election.status.value,
        results=results,
        candidates=[CandidateResponse(**c.__dict__) for c in candidates],
    )


async def _resolve_display_election_id(election_service: ElectionService) -> int | None:
    published = await election_service.get_published_election()
    return published.id if published else None


async def _ensure_results_are_public(election_service: ElectionService, election_id: int) -> None:
    published = await election_service.get_published_election()
    if not published or published.id != election_id:
        raise HTTPException(status_code=404, detail="Aucun résultat disponible")


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    body: FeedbackRequest,
    feedback_service: Annotated[FeedbackService, Depends(get_feedback_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FeedbackResponse:
    try:
        await feedback_service.submit(body.email, body.phone, body.message)
        await session.commit()
        return FeedbackResponse(message="Votre message a bien été envoyé. Merci.")
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/check-registration", response_model=RegistrationCheckResponse)
async def check_registration(
    body: RegistrationCheckRequest,
    voter_service: Annotated[VoterService, Depends(get_voter_service)],
) -> RegistrationCheckResponse:
    registered, message = await voter_service.check_registration(body.email)
    return RegistrationCheckResponse(registered=registered, message=message)


@router.post("/otp/request", response_model=OtpSentResponse)
async def request_otp(
    body: OtpRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OtpSentResponse:
    try:
        email_hint, code = await auth_service.request_otp(body.identifier)
        await session.commit()
        return OtpSentResponse(
            message=(
                f"Code OTP (mode dev) : {code} — vérifiez aussi {email_hint}"
                if settings.otp_dev_mode
                else "Code OTP envoyé par email."
            ),
            email_hint=email_hint,
            dev_code=code if settings.otp_dev_mode else None,
        )
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    body: OtpVerifyRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    try:
        token, _ = await auth_service.verify_otp(body.identifier, body.code)
        await session.commit()
        return TokenResponse(access_token=token)
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/me", response_model=VoterResponse)
async def get_me(
    voter_id: Annotated[int, Depends(get_current_voter_id)],
    voter_repo: Annotated[IVoterRepository, Depends(get_voter_repo)],
) -> VoterResponse:
    voter = await voter_repo.get_by_id(voter_id)
    if not voter:
        raise HTTPException(status_code=404, detail="Électeur introuvable")
    return VoterResponse(**voter.__dict__)


@router.get("/live-dashboard", response_model=LiveDashboardResponse)
async def get_live_dashboard(
    vote_service: Annotated[VoteService, Depends(get_vote_service)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LiveDashboardResponse:
    await _close_expired_elections(election_service, session)
    data = await vote_service.get_live_dashboard()
    return LiveDashboardResponse(
        voter_stats=data["voter_stats"],
        elections=[ElectionLiveDashboard(**item) for item in data["elections"]],
    )


@router.get("/elections/active", response_model=list[ElectionResponse])
async def list_active_elections(
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ElectionResponse]:
    await _close_expired_elections(election_service, session)
    elections = await election_service.list_all()
    active = [e for e in elections if e.status == ElectionStatus.ACTIVE]
    return [
        ElectionResponse(
            id=e.id,
            title=e.title,
            description=e.description,
            status=e.status.value,
            starts_at=e.starts_at,
            ends_at=e.ends_at,
            results_published=e.results_published,
        )
        for e in active
    ]


@router.get("/elections/{election_id}/candidates", response_model=list[CandidateResponse])
async def list_candidates(
    election_id: int,
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
) -> list[CandidateResponse]:
    candidates = await candidate_service.list_by_election(election_id)
    return [CandidateResponse(**c.__dict__) for c in candidates]


@router.post("/cast", response_model=VoteResponse)
async def cast_vote(
    body: CastVoteRequest,
    voter_id: Annotated[int, Depends(get_current_voter_id)],
    vote_service: Annotated[VoteService, Depends(get_vote_service)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> VoteResponse:
    await _close_expired_elections(election_service, session)
    try:
        vote = await vote_service.cast_vote(voter_id, body.election_id, body.candidate_id)
        await session.commit()
        return VoteResponse(message="Vote enregistré avec succès", cast_at=vote.cast_at)
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/elections/current/results", response_model=ResultsResponse)
async def get_current_election_results(
    vote_service: Annotated[VoteService, Depends(get_vote_service)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ResultsResponse:
    await _close_expired_elections(election_service, session)
    election_id = await _resolve_display_election_id(election_service)
    if election_id is None:
        raise HTTPException(status_code=404, detail="Aucun résultat disponible")
    try:
        return await _build_results_response(election_id, vote_service, candidate_service, election_service)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/elections/{election_id}/results", response_model=ResultsResponse)
async def get_results(
    election_id: int,
    vote_service: Annotated[VoteService, Depends(get_vote_service)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
) -> ResultsResponse:
    await _ensure_results_are_public(election_service, election_id)
    try:
        return await _build_results_response(election_id, vote_service, candidate_service, election_service)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
