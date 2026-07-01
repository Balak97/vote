from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_auth_service,
    get_candidate_service,
    get_current_admin,
    get_election_service,
    get_voter_import_service,
    get_voter_repo,
)
from app.api.schemas import (
    AdminLoginRequest,
    CandidateResponse,
    ElectionCreateRequest,
    ElectionResponse,
    ElectionUpdateRequest,
    ImportResultResponse,
    TokenResponse,
    VoterResponse,
)
from app.domain.entities import Candidate
from app.domain.interfaces import IVoterRepository
from app.infrastructure.database.session import get_session
from app.infrastructure.storage.photo_storage import PhotoStorageService
from app.services import AuthService, CandidateService, ElectionService, VoterImportService

router = APIRouter(prefix="/admin", tags=["admin"])
photo_storage = PhotoStorageService()


def _to_election_response(election) -> ElectionResponse:
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        status=election.status.value,
        starts_at=election.starts_at,
        ends_at=election.ends_at,
    )


@router.post("/login", response_model=TokenResponse)
async def admin_login(
    body: AdminLoginRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    try:
        token = auth_service.verify_admin(body.username, body.password)
        return TokenResponse(access_token=token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/voters/import", response_model=ImportResultResponse)
async def import_voters(
    _: Annotated[str, Depends(get_current_admin)],
    import_service: Annotated[VoterImportService, Depends(get_voter_import_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
) -> ImportResultResponse:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel (.xlsx) requis")

    content = await file.read()
    try:
        created, skipped = await import_service.import_from_excel(content)
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ImportResultResponse(
        imported=len(created),
        skipped=skipped,
        voters=[VoterResponse(**v.__dict__) for v in created],
    )


@router.get("/voters", response_model=list[VoterResponse])
async def list_voters(
    _: Annotated[str, Depends(get_current_admin)],
    voter_repo: Annotated[IVoterRepository, Depends(get_voter_repo)],
) -> list[VoterResponse]:
    voters = await voter_repo.list_all()
    return [VoterResponse(**v.__dict__) for v in voters]


@router.post("/elections", response_model=ElectionResponse)
async def create_election(
    body: ElectionCreateRequest,
    _: Annotated[str, Depends(get_current_admin)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ElectionResponse:
    try:
        election = await election_service.create(
            body.title,
            body.description,
            body.starts_at,
            body.ends_at,
        )
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_election_response(election)


@router.get("/elections", response_model=list[ElectionResponse])
async def list_elections(
    _: Annotated[str, Depends(get_current_admin)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
) -> list[ElectionResponse]:
    elections = await election_service.list_all()
    return [_to_election_response(e) for e in elections]


@router.patch("/elections/{election_id}", response_model=ElectionResponse)
async def update_election(
    election_id: int,
    body: ElectionUpdateRequest,
    _: Annotated[str, Depends(get_current_admin)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ElectionResponse:
    try:
        election = await election_service.update(
            election_id,
            title=body.title,
            description=body.description,
            starts_at=body.starts_at,
            ends_at=body.ends_at,
        )
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_election_response(election)


@router.post("/elections/{election_id}/activate", response_model=ElectionResponse)
async def activate_election(
    election_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ElectionResponse:
    try:
        election = await election_service.activate(election_id)
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _to_election_response(election)


@router.post("/elections/{election_id}/close", response_model=ElectionResponse)
async def close_election(
    election_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    election_service: Annotated[ElectionService, Depends(get_election_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ElectionResponse:
    try:
        election = await election_service.close(election_id)
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _to_election_response(election)


@router.post("/candidates", response_model=CandidateResponse)
async def create_candidate(
    _: Annotated[str, Depends(get_current_admin)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
    election_id: int = Form(...),
    last_name: str = Form(...),
    first_name: str = Form(...),
    description: str | None = Form(None),
    position: str | None = Form(None),
    photo: UploadFile | None = File(None),
) -> CandidateResponse:
    photo_url = None
    if photo and photo.filename:
        try:
            photo_url = await photo_storage.save_candidate_photo(photo)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    candidate = Candidate(
        id=None,
        election_id=election_id,
        last_name=last_name,
        first_name=first_name,
        description=description,
        position=position,
        photo_url=photo_url,
    )
    created = await candidate_service.create(candidate)
    await session.commit()
    return CandidateResponse(**created.__dict__)


@router.post("/candidates/{candidate_id}/photo", response_model=CandidateResponse)
async def upload_candidate_photo(
    candidate_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
    photo: UploadFile = File(...),
) -> CandidateResponse:
    existing = await candidate_service.get_by_id(candidate_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Candidat introuvable")

    try:
        photo_url = await photo_storage.save_candidate_photo(photo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if existing.photo_url:
        photo_storage.delete_photo(existing.photo_url)

    updated = await candidate_service.update_photo(candidate_id, photo_url)
    await session.commit()
    return CandidateResponse(**updated.__dict__)


@router.get("/elections/{election_id}/candidates", response_model=list[CandidateResponse])
async def list_candidates_admin(
    election_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
) -> list[CandidateResponse]:
    candidates = await candidate_service.list_by_election(election_id)
    return [CandidateResponse(**c.__dict__) for c in candidates]


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    candidate_service: Annotated[CandidateService, Depends(get_candidate_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    existing = await candidate_service.get_by_id(candidate_id)
    if existing and existing.photo_url:
        photo_storage.delete_photo(existing.photo_url)
    await candidate_service.delete(candidate_id)
    await session.commit()
