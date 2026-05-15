"""Shared test fixtures for the DEALR test suite."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import httpx
import pytest
from fastapi import FastAPI

from app.main import create_app


@pytest.fixture(scope="session")
def app() -> FastAPI:
    """Create a fresh FastAPI app for the test session."""
    return create_app()


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client wired to the test app (no real network)."""
    from httpx import ASGITransport

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
