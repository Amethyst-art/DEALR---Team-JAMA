from __future__ import annotations

import pytest

from app.squad.errors import (
    SquadAuthError,
    SquadBadRequestError,
    SquadError,
    SquadNotFoundError,
    SquadRequeryableError,
    SquadReversedError,
    SquadTransientError,
    SquadUnprocessableError,
)


def test_squad_error_mapping() -> None:
    assert SquadError.from_status_code(200, "ok") is None
    assert isinstance(SquadError.from_status_code(400, "bad request"), SquadBadRequestError)
    assert isinstance(SquadError.from_status_code(401, "unauthorized"), SquadAuthError)
    assert isinstance(SquadError.from_status_code(403, "forbidden"), SquadAuthError)
    assert isinstance(SquadError.from_status_code(404, "not found"), SquadNotFoundError)
    assert isinstance(SquadError.from_status_code(412, "reversed"), SquadReversedError)
    assert isinstance(SquadError.from_status_code(422, "unprocessable"), SquadUnprocessableError)
    assert isinstance(SquadError.from_status_code(424, "requeryable"), SquadRequeryableError)
    assert isinstance(SquadError.from_status_code(500, "server error"), SquadTransientError)
    assert isinstance(SquadError.from_status_code(503, "service unavailable"), SquadTransientError)


def test_squad_error_preserves_transaction_ref() -> None:
    error = SquadError.from_status_code(
        400,
        "bad request",
        squad_message="Squad rejected request",
        transaction_ref="ref-123",
    )
    assert error is not None
    assert error.transaction_ref == "ref-123"
