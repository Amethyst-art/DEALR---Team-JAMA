from __future__ import annotations

import hashlib
import hmac
import json

from app.squad.webhooks import (
    verify_dva_signature,
    verify_payment_signature,
    verify_transfer_signature,
)


SECRET = "sandboxsecret"


def compute_dva_signature(payload: dict[str, str], secret: str) -> str:
    payload_to_sign = {
        "transaction_reference": payload["transaction_reference"],
        "amount_received": payload["amount_received"],
        "merchant_reference": payload["merchant_reference"],
    }
    json_str = json.dumps(payload_to_sign, separators=(",", ":"), ensure_ascii=False)
    return hmac.new(
        secret.encode("utf-8"),
        json_str.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()


def compute_full_body_signature(raw_body: bytes, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()


def test_verify_dva_signature_valid() -> None:
    payload = {
        "transaction_reference": "tx-123",
        "amount_received": "6850000",
        "merchant_reference": "job-456",
    }
    signature = compute_dva_signature(payload, SECRET)

    assert verify_dva_signature(payload, signature, SECRET)


def test_verify_dva_signature_invalid_after_tamper() -> None:
    payload = {
        "transaction_reference": "tx-123",
        "amount_received": "6850000",
        "merchant_reference": "job-456",
    }
    signature = compute_dva_signature(payload, SECRET)
    payload["amount_received"] = "6850001"

    assert not verify_dva_signature(payload, signature, SECRET)


def test_verify_dva_signature_missing_field() -> None:
    payload = {
        "transaction_reference": "tx-123",
        "amount_received": "6850000",
    }
    signature = compute_dva_signature(
        {
            "transaction_reference": payload["transaction_reference"],
            "amount_received": payload["amount_received"],
            "merchant_reference": "job-456",
        },
        SECRET,
    )

    assert not verify_dva_signature(payload, signature, SECRET)


def test_verify_dva_signature_requires_signature() -> None:
    payload = {
        "transaction_reference": "tx-123",
        "amount_received": "6850000",
        "merchant_reference": "job-456",
    }

    assert not verify_dva_signature(payload, "", SECRET)
    assert not verify_dva_signature(payload, compute_dva_signature(payload, SECRET), "")


def test_verify_payment_signature_rejects_non_bytes_body() -> None:
    raw_body = '{"status":"success","transaction_ref":"tx-789"}'
    signature = compute_full_body_signature(raw_body.encode("utf-8"), SECRET)

    assert not verify_payment_signature(raw_body, signature, SECRET)
    assert not verify_transfer_signature(raw_body, signature, SECRET)


def test_verify_payment_and_transfer_signature_valid() -> None:
    raw_body = b'{"status":"success","transaction_ref":"tx-789"}'
    signature = compute_full_body_signature(raw_body, SECRET)

    assert verify_payment_signature(raw_body, signature, SECRET)
    assert verify_transfer_signature(raw_body, signature, SECRET)
