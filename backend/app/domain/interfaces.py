from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.entities import Candidate, Election, OtpSession, Vote, Voter


class IVoterRepository(ABC):
    @abstractmethod
    async def get_by_id(self, voter_id: int) -> Voter | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Voter | None: ...

    @abstractmethod
    async def get_by_phone(self, phone: str) -> Voter | None: ...

    @abstractmethod
    async def list_all(self) -> list[Voter]: ...

    @abstractmethod
    async def count_active(self) -> int: ...

    @abstractmethod
    async def create_many(self, voters: list[Voter]) -> list[Voter]: ...

    @abstractmethod
    async def mark_as_voted(self, voter_id: int) -> None: ...


class ICandidateRepository(ABC):
    @abstractmethod
    async def get_by_id(self, candidate_id: int) -> Candidate | None: ...

    @abstractmethod
    async def list_by_election(self, election_id: int) -> list[Candidate]: ...

    @abstractmethod
    async def create(self, candidate: Candidate) -> Candidate: ...

    @abstractmethod
    async def update_photo(self, candidate_id: int, photo_url: str) -> Candidate: ...

    @abstractmethod
    async def delete(self, candidate_id: int) -> None: ...


class IElectionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, election_id: int) -> Election | None: ...

    @abstractmethod
    async def list_all(self) -> list[Election]: ...

    @abstractmethod
    async def create(self, election: Election) -> Election: ...

    @abstractmethod
    async def update(self, election: Election) -> Election: ...


class IVoteRepository(ABC):
    @abstractmethod
    async def has_voted(self, voter_id: int, election_id: int) -> bool: ...

    @abstractmethod
    async def create(self, vote: Vote) -> Vote: ...

    @abstractmethod
    async def count_by_candidate(self, election_id: int) -> dict[int, int]: ...

    @abstractmethod
    async def count_for_election(self, election_id: int) -> int: ...


class IOtpRepository(ABC):
    @abstractmethod
    async def create(self, session: OtpSession) -> OtpSession: ...

    @abstractmethod
    async def get_valid(self, voter_id: int, code: str) -> OtpSession | None: ...

    @abstractmethod
    async def mark_verified(self, session_id: int) -> None: ...

    @abstractmethod
    async def invalidate_previous(self, voter_id: int) -> None: ...


class INotificationService(ABC):
    """Envoi du code OTP par email uniquement."""

    @abstractmethod
    async def send_otp_email(self, email: str, code: str) -> None: ...


class IExcelImporter(ABC):
    @abstractmethod
    async def parse_voters(self, file_content: bytes) -> list[Voter]: ...
