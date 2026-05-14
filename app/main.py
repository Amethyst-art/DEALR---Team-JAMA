"""DEALR backend — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import structlog
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application-wide resources."""
    settings = get_settings()
    configure_logging(log_level=settings.LOG_LEVEL, env=settings.ENV)

    # Shared httpx client — used by app/squad/client.py (injected later)
    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(15.0),
        http2=True,
    )
    log.info("app.startup", env=settings.ENV)

    yield

    # Shutdown
    await app.state.http_client.aclose()
    log.info("app.shutdown")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    application = FastAPI(
        title="DEALR API",
        description="AI-powered economic platform for Nigeria's informal workforce",
        version="0.1.0",
        lifespan=lifespan,
        default_response_class=ORJSONResponse,
        docs_url="/docs" if settings.ENV != "production" else None,
        redoc_url="/redoc" if settings.ENV != "production" else None,
    )

    register_exception_handlers(application)

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
