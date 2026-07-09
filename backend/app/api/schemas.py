from datetime import datetime

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OtpRequest(BaseModel):
    identifier: str = Field(..., description="Email ou téléphone (+7...) pour retrouver le compte électeur")


class OtpSentResponse(BaseModel):
    message: str
    email_hint: str
    dev_code: str | None = None

class OtpVerifyRequest(BaseModel):
    identifier: str
    code: str = Field(..., min_length=6, max_length=6)


class VoterResponse(BaseModel):
    id: int
    email: str
    phone: str
    last_name: str
    first_name: str
    has_voted: bool
    is_active: bool


class VoterUpdateRequest(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class BroadcastMessageRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=3, max_length=5000)


class BroadcastMessageResponse(BaseModel):
    sent: int
    failed: int
    message: str


class FeedbackRequest(BaseModel):
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=20)
    message: str = Field(..., min_length=3, max_length=5000)


class FeedbackResponse(BaseModel):
    message: str


class FeedbackItemResponse(BaseModel):
    id: int
    email: str
    phone: str
    message: str
    created_at: datetime


class RegistrationCheckRequest(BaseModel):
    email: str = Field(..., max_length=255)


class RegistrationCheckResponse(BaseModel):
    registered: bool
    message: str


class ImportResultResponse(BaseModel):
    imported: int
    skipped: list[str]
    voters: list[VoterResponse]


class ElectionCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime


class ElectionUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class PublishResultsRequest(BaseModel):
    published: bool = True


class ElectionResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    starts_at: datetime | None
    ends_at: datetime | None
    results_published: bool = False


class CandidateCreateRequest(BaseModel):
    election_id: int
    last_name: str = Field(..., min_length=1, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    position: str | None = None


class CandidateResponse(BaseModel):
    id: int
    election_id: int
    last_name: str
    first_name: str
    description: str | None
    position: str | None
    photo_url: str | None = None


class CastVoteRequest(BaseModel):
    election_id: int
    candidate_id: int


class VoteResponse(BaseModel):
    message: str
    cast_at: datetime


class ResultsResponse(BaseModel):
    election_id: int
    title: str
    status: str
    results: dict[int, int]
    candidates: list[CandidateResponse]


class CandidateLiveStats(BaseModel):
    id: int
    first_name: str
    last_name: str
    position: str | None
    description: str | None
    photo_url: str | None = None
    votes: int
    percentage: float


class ElectionLiveDashboard(BaseModel):
    election_id: int
    title: str
    description: str | None
    status: str
    starts_at: datetime | None
    ends_at: datetime | None
    total_votes: int
    candidates: list[CandidateLiveStats]
    updated_at: datetime


class VoterParticipationStats(BaseModel):
    total_electors: int
    voted_count: int
    pending_count: int
    participation_rate: float


class LiveDashboardResponse(BaseModel):
    voter_stats: VoterParticipationStats
    elections: list[ElectionLiveDashboard]
