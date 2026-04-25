"""
Async SQLAlchemy engine + session factory — lazy-initialized so test
conftest can set DATABASE_URL before the engine is created.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

# Engine and session factory are created on first use (lazy), NOT at import time.
# This lets test conftest.py override get_db before any engine is built.
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    pass


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        from app.core.config import settings

        kwargs: dict = dict(echo=settings.DEBUG, pool_pre_ping=True)

        # SQLite (used in tests) doesn't support pool_size / max_overflow
        if not settings.DATABASE_URL.startswith("sqlite"):
            kwargs["pool_size"] = 10
            kwargs["max_overflow"] = 20

        _engine = create_async_engine(settings.DATABASE_URL, **kwargs)
    return _engine


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=_get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    factory = _get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables (dev convenience — use Alembic in production)."""
    engine = _get_engine()
    async with engine.begin() as conn:
        from app.models import user, document, chat, quiz, progress  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")
