from collections.abc import AsyncGenerator

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.infrastructure.database.models import Base


def _engine_kwargs() -> dict:
    kwargs: dict = {"echo": False}
    if settings.database_url.startswith("mysql"):
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 3600
    return kwargs


engine = create_async_engine(settings.database_url, **_engine_kwargs())
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _migrate_schema(sync_conn) -> None:
    inspector = inspect(sync_conn)
    if inspector.has_table("candidates"):
        column_names = {col["name"] for col in inspector.get_columns("candidates")}
        if "photo_url" not in column_names:
            sync_conn.execute(text("ALTER TABLE candidates ADD COLUMN photo_url VARCHAR(512)"))
    if inspector.has_table("elections"):
        election_columns = {col["name"] for col in inspector.get_columns("elections")}
        if "results_published" not in election_columns:
            sync_conn.execute(
                text("ALTER TABLE elections ADD COLUMN results_published BOOLEAN DEFAULT 0"),
            )


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_schema)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
