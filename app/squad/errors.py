"""Squad API error classes and status-code mapping."""

from __future__ import annotations

from typing import Any

from app.core.errors import ExternalServiceError


class SquadError(ExternalServiceError):
    """Base exception for Squad API failures."""

    squad_message: str = "Squad API error"
    transaction_ref: str | None = None

    def __init__(
        self,
        message: str = "Squad API request failed",
        *,
        squad_message: str | None = None,
        transaction_ref: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.squad_message = squad_message or self.squad_message
        self.transaction_ref = transaction_ref
        super().__init__(message, details=details)

    @classmethod
    def from_status_code(
        cls,
        status_code: int,
        message: str = "Squad API request failed",
        *,
        squad_message: str | None = None,
        transaction_ref: str | None = None,
    ) -> SquadError | None:
        if status_code == 200:
            return None
        if status_code == 400:
            return SquadBadRequestError(
                message,
                squad_message=squad_message or "Bad request to Squad API",
                transaction_ref=transaction_ref,
            )
        if status_code in (401, 403):
            return SquadAuthError(
                message,
                squad_message=squad_message or "Squad authentication failed",
                transaction_ref=transaction_ref,
            )
        if status_code == 404:
            return SquadNotFoundError(
                message,
                squad_message=squad_message or "Squad resource not found",
                transaction_ref=transaction_ref,
            )
        if status_code == 412:
            return SquadReversedError(
                message,
                squad_message=squad_message or "Squad transfer reversed",
                transaction_ref=transaction_ref,
            )
        if status_code == 422:
            return SquadUnprocessableError(
                message,
                squad_message=squad_message or "Squad request unprocessable",
                transaction_ref=transaction_ref,
            )
        if status_code == 424:
            return SquadRequeryableError(
                message,
                squad_message=squad_message or "Squad request needs requery",
                transaction_ref=transaction_ref,
            )
        if 500 <= status_code < 600:
            return SquadTransientError(
                message,
                squad_message=squad_message or "Squad transient error",
                transaction_ref=transaction_ref,
            )
        return SquadError(
            message,
            squad_message=squad_message or "Unexpected Squad error",
            transaction_ref=transaction_ref,
        )


class SquadBadRequestError(SquadError):
    squad_message = "Bad request to Squad API"


class SquadAuthError(SquadError):
    squad_message = "Squad authentication failed"


class SquadNotFoundError(SquadError):
    squad_message = "Squad resource not found"


class SquadReversedError(SquadError):
    squad_message = "Squad transfer reversed"


class SquadUnprocessableError(SquadError):
    squad_message = "Squad request unprocessable"


class SquadRequeryableError(SquadError):
    squad_message = "Squad request needs requery"


class SquadTransientError(SquadError):
    squad_message = "Squad transient error"
