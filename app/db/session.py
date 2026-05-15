"""Async database engine and session factory for Supabase Postgres."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings

# Module-level singletons — initialised by ``init_db`` at app startup.
_engine_instance: create_async_engine | None = None  # type: ignore[type-arg]
_session_factory: async_sessionmaker[AsyncSession] | None = None


def init_db(settings: Settings) -> None:
    """Create the async engine and session factory.

    Must be called once during FastAPI lifespan startup.
    Supabase requires SSL on all connections — enforced via connect_args.
    """
    global _engine_instance, _session_factory

    _engine_instance = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.ENV == "development",
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=5,
        connect_args={"ssl": "require"},
    )

    _session_factory = async_sessionmaker(
        bind=_engine_instance,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def close_db() -> None:
    """Dispose the engine. Called during lifespan shutdown."""
    global _engine_instance, _session_factory
    if _engine_instance is not None:
        await _engine_instance.dispose()
        _engine_instance = None
        _session_factory = None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the session factory. Raises if ``init_db`` hasn't been called."""
    if _session_factory is None:
        raise RuntimeError("Database not initialised — call init_db() first")
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    factory = get_session_factory()
    async with factory() as session:
        yield session
