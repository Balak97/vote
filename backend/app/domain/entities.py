from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ElectionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


@dataclass
class Voter:
    id: int | None
    email: str
    phone: str
    last_name: str
    first_name: str
    has_voted: bool = False
    is_active: bool = True


@dataclass
class Candidate:
    id: int | None
    election_id: int
    last_name: str
    first_name: str
    description: str | None = None
    position: str | None = None
    photo_url: str | None = None


@dataclass
class Election:
    id: int | None
    title: str
    description: str | None
    status: ElectionStatus
    starts_at: datetime | None = None
    ends_at: datetime | None = None


@dataclass
class Vote:
    id: int | None
    election_id: int
    candidate_id: int
    voter_id: int
    cast_at: datetime


@dataclass
class OtpSession:
    id: int | None
    voter_id: int
    code: str
    expires_at: datetime
    verified: bool = False
