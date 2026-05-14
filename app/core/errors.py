"""Exception hierarchy and FastAPI exception handlers.

Error envelope shape (CLAUDE.md §10):
    {
        "error": {"code": "domain.specific", "message": "human", "details": {}},
        "request_id": "..."
    }
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse


# ── Exception hierarchy ─────────────────────────────────────────────────


class DealrError(Exception):
    """Base exception for all DEALR domain errors."""

    status_code: int = 500
    code: str = "internal"

    def __init__(
        self,
        message: str = "An internal error occurred",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ValidationDealrError(DealrError):
    status_code = 422
    code = "validation.error"

    def __init__(
        self,
        message: str = "Validation failed",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


class NotFoundDealrError(DealrError):
    status_code = 404
    code = "not_found"

    def __init__(
        self,
        message: str = "Resource not found",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


class AuthDealrError(DealrError):
    status_code = 401
    code = "auth.unauthorized"

    def __init__(
        self,
        message: str = "Authentication required",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


class ConflictDealrError(DealrError):
    status_code = 409
    code = "conflict"

    def __init__(
        self,
        message: str = "Conflict",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


class ExternalServiceError(DealrError):
    status_code = 502
    code = "external_service"

    def __init__(
        self,
        message: str = "External service error",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


# ── FastAPI exception handlers ──────────────────────────────────────────


def _build_error_response(
    request: Request, exc: DealrError
) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
            "request_id": getattr(request.state, "request_id", None),
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach DEALR error handlers to the FastAPI app."""

    @app.exception_handler(DealrError)
    async def _dealr_error_handler(
        request: Request, exc: DealrError
    ) -> ORJSONResponse:
        return _build_error_response(request, exc)
