from datetime import datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models import RateLimitHitModel

RATE_LIMIT_MESSAGE = "Trop de tentatives. Veuillez réessayer dans quelques minutes."


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _bucket(prefix: str, value: str) -> str:
    return f"{prefix}:{value}"[:255]


class RateLimitService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def enforce(self, bucket: str, max_hits: int, window_seconds: int) -> None:
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_seconds)
        purge_before = now - timedelta(hours=24)

        await self._session.execute(
            delete(RateLimitHitModel).where(RateLimitHitModel.hit_at < purge_before),
        )

        count_stmt = (
            select(func.count())
            .select_from(RateLimitHitModel)
            .where(
                RateLimitHitModel.bucket_key == bucket,
                RateLimitHitModel.hit_at >= cutoff,
            )
        )
        current = (await self._session.execute(count_stmt)).scalar_one()
        if current >= max_hits:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=RATE_LIMIT_MESSAGE,
            )

        self._session.add(RateLimitHitModel(bucket_key=bucket, hit_at=now))
        await self._session.flush()

    async def enforce_ip(self, request: Request, prefix: str, max_hits: int, window_seconds: int) -> None:
        await self.enforce(_bucket(prefix, get_client_ip(request)), max_hits, window_seconds)

    async def enforce_value(
        self,
        prefix: str,
        value: str,
        max_hits: int,
        window_seconds: int,
    ) -> None:
        normalized = value.strip().lower()[:200]
        await self.enforce(_bucket(prefix, normalized), max_hits, window_seconds)
