"""Squad webhook signature verification helpers."""

from __future__ import annotations

import hashlib
import hmac
import json


def verify_dva_signature(payload: dict, header_sig: str, secret: str) -> bool:
    """Verify Squad Dynamic VA webhook signatures."""
    if not header_sig or not secret:
        return False

    try:
        data = {
            "transaction_reference": payload["transaction_reference"],
            "amount_received": payload["amount_received"],
            "merchant_reference": payload["merchant_reference"],
        }
    except KeyError:
        return False

    try:
        json_str = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        digest = hmac.new(
            secret.encode("utf-8"),
            json_str.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()
    except (TypeError, ValueError):
        return False

    return hmac.compare_digest(digest, header_sig.lower())


def verify_payment_signature(raw_body: bytes, header_sig: str, secret: str) -> bool:
    """Verify Squad Modal payment webhook signatures."""
    if not header_sig or not secret or not isinstance(raw_body, (bytes, bytearray)):
        return False

    try:
        digest = hmac.new(
            secret.encode("utf-8"),
            raw_body,
            hashlib.sha512,
        ).hexdigest()
    except (TypeError, ValueError):
        return False

    return hmac.compare_digest(digest, header_sig.lower())


def verify_transfer_signature(raw_body: bytes, header_sig: str, secret: str) -> bool:
    """Verify Squad transfer/refund webhook signatures."""
    return verify_payment_signature(raw_body, header_sig, secret)
