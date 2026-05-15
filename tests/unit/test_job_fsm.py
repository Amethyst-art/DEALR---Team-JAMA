import pytest

from app.services.jobs import ALLOWED_TRANSITIONS, JobState, JobStateError, transition


def test_allowed_transitions() -> None:
    for current, next_states in ALLOWED_TRANSITIONS.items():
        for next_state in next_states:
            assert transition(current, next_state, trigger="test") is next_state


def test_disallowed_transition_raises() -> None:
    for current in JobState:
        for candidate in JobState:
            if candidate in ALLOWED_TRANSITIONS.get(current, frozenset()):
                continue
            if current == candidate:
                continue
            with pytest.raises(JobStateError):
                transition(current, candidate, trigger="invalid")


# ── DVA-driven transitions (special focus per §7.2) ────────────────────


def test_agreed_to_escrowed_via_dva_success() -> None:
    """DVA SUCCESS webhook drives AGREED → ESCROWED."""
    result = transition(JobState.AGREED, JobState.ESCROWED, trigger="dva_success")
    assert result is JobState.ESCROWED


def test_agreed_to_expired_cancelled_via_dva_expired() -> None:
    """DVA EXPIRED webhook drives AGREED → EXPIRED_CANCELLED (terminal)."""
    result = transition(JobState.AGREED, JobState.EXPIRED_CANCELLED, trigger="dva_expired")
    assert result is JobState.EXPIRED_CANCELLED


def test_expired_cancelled_is_terminal() -> None:
    """EXPIRED_CANCELLED has no outgoing transitions."""
    assert ALLOWED_TRANSITIONS[JobState.EXPIRED_CANCELLED] == frozenset()
    for candidate in JobState:
        if candidate == JobState.EXPIRED_CANCELLED:
            continue
        with pytest.raises(JobStateError):
            transition(JobState.EXPIRED_CANCELLED, candidate, trigger="impossible")


def test_agreed_rejects_non_dva_transitions() -> None:
    """AGREED only allows ESCROWED and EXPIRED_CANCELLED — nothing else."""
    for candidate in JobState:
        if candidate in (JobState.ESCROWED, JobState.EXPIRED_CANCELLED):
            continue
        with pytest.raises(JobStateError):
            transition(JobState.AGREED, candidate, trigger="invalid")


def test_transition_error_includes_details() -> None:
    """JobStateError carries from/to/trigger details."""
    with pytest.raises(JobStateError) as exc_info:
        transition(JobState.DRAFT, JobState.RELEASED, trigger="bad_trigger")
    assert exc_info.value.details["from"] == "DRAFT"
    assert exc_info.value.details["to"] == "RELEASED"
    assert exc_info.value.details["trigger"] == "bad_trigger"


def test_all_states_present_in_transitions_map() -> None:
    """Every JobState has an entry in ALLOWED_TRANSITIONS."""
    for state in JobState:
        assert state in ALLOWED_TRANSITIONS


def test_terminal_states_have_no_outgoing() -> None:
    """Terminal states (RELEASED, REFUNDED, EXPIRED_CANCELLED) have empty transitions."""
    for terminal in (JobState.RELEASED, JobState.REFUNDED, JobState.EXPIRED_CANCELLED):
        assert ALLOWED_TRANSITIONS[terminal] == frozenset()
