from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.infrastructure.database.models import Base

engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _migrate_schema(sync_conn) -> None:
    columns = sync_conn.execute(text("PRAGMA table_info(candidates)")).fetchall()
    column_names = {row[1] for row in columns}
    if "photo_url" not in column_names:
        sync_conn.execute(text("ALTER TABLE candidates ADD COLUMN photo_url VARCHAR(512)"))


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_schema)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
