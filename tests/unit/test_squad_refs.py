from __future__ import annotations

from uuid import uuid4

import pytest

from app.squad.refs import build_transfer_ref, parse_transfer_ref


def test_build_transfer_ref_contains_merchant_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SQUAD_MERCHANT_ID", "TESTMERCH")

    ref = build_transfer_ref(uuid4())

    assert ref.startswith("TESTMERCH_")
    parts = ref.split("_")
    assert len(parts) == 3
    assert len(parts[1]) == 8
    assert len(parts[2]) == 26


def test_parse_transfer_ref_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SQUAD_MERCHANT_ID", "SOMEID")
    ref = build_transfer_ref(uuid4())

    parsed = parse_transfer_ref(ref)

    assert parsed["merchant_id"] == "SOMEID"
    assert len(parsed["job_short"]) == 8
    assert len(parsed["ulid"]) == 26


def test_parse_transfer_ref_rejects_invalid_string() -> None:
    with pytest.raises(ValueError):
        parse_transfer_ref("invalid_reference")


def test_parse_transfer_ref_rejects_invalid_ulid() -> None:
    with pytest.raises(ValueError):
        parse_transfer_ref("TESTMERCH_12345678_invalidulid")


def test_build_transfer_ref_requires_merchant_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SQUAD_MERCHANT_ID", "")

    with pytest.raises(ValueError):
        build_transfer_ref(uuid4())


def test_build_transfer_ref_is_unique_across_many_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SQUAD_MERCHANT_ID", "UNIQUEID")

    refs = {build_transfer_ref(uuid4()) for _ in range(50)}
    assert len(refs) == 50
