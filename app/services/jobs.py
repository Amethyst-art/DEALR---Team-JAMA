from __future__ import annotations

from enum import StrEnum

from app.core.errors import ConflictDealrError


class JobStateError(ConflictDealrError):
    def __init__(self, message: str, *, details: dict[str, str] | None = None) -> None:
        super().__init__(message, details=details)


class JobState(StrEnum):
    DRAFT = "DRAFT"
    PRICED = "PRICED"
    AGREED = "AGREED"
    ESCROWED = "ESCROWED"
    IN_PROGRESS = "IN_PROGRESS"
    DELIVERED = "DELIVERED"
    CONFIRMED = "CONFIRMED"
    DISPUTED = "DISPUTED"
    RESOLVED_RELEASE = "RESOLVED_RELEASE"
    RESOLVED_REFUND = "RESOLVED_REFUND"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"
    EXPIRED_CANCELLED = "EXPIRED_CANCELLED"


ALLOWED_TRANSITIONS: dict[JobState, frozenset[JobState]] = {
    JobState.DRAFT: frozenset({JobState.PRICED}),
    JobState.PRICED: frozenset({JobState.AGREED}),
    JobState.AGREED: frozenset({JobState.ESCROWED, JobState.EXPIRED_CANCELLED}),
    JobState.ESCROWED: frozenset({JobState.IN_PROGRESS}),
    JobState.IN_PROGRESS: frozenset({JobState.DELIVERED}),
    JobState.DELIVERED: frozenset({JobState.CONFIRMED, JobState.DISPUTED}),
    JobState.CONFIRMED: frozenset({JobState.RELEASED}),
    JobState.DISPUTED: frozenset({JobState.RESOLVED_RELEASE, JobState.RESOLVED_REFUND}),
    JobState.RESOLVED_RELEASE: frozenset({JobState.RELEASED}),
    JobState.RESOLVED_REFUND: frozenset({JobState.REFUNDED}),
    JobState.RELEASED: frozenset(),
    JobState.REFUNDED: frozenset(),
    JobState.EXPIRED_CANCELLED: frozenset(),
}


def transition(current: JobState, next_state: JobState, trigger: str) -> JobState:
    allowed = ALLOWED_TRANSITIONS.get(current, frozenset())
    if next_state not in allowed:
        raise JobStateError(
            f"Invalid transition from {current.value} to {next_state.value}",
            details={
                "from": current.value,
                "to": next_state.value,
                "trigger": trigger,
            },
        )
    return next_state
