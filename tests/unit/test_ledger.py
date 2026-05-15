from decimal import Decimal

import pytest

from app.services.ledger import (
    LedgerEntry,
    LedgerError,
    assert_balanced,
    bankers_round,
    post_disbursement,
    post_escrowed,
    post_refunded,
    post_released,
)


# ── Banker's rounding ───────────────────────────────────────────────────


def test_bankers_round_half_even() -> None:
    """0.5→0, 1.5→2, 2.5→2 per ROUND_HALF_EVEN."""
    assert bankers_round(1, Decimal("0.5")) == 0   # 0.5 → 0
    assert bankers_round(3, Decimal("0.5")) == 2   # 1.5 → 2
    assert bankers_round(5, Decimal("0.5")) == 2   # 2.5 → 2
    assert bankers_round(7, Decimal("0.5")) == 4   # 3.5 → 4


def test_bankers_round_exact_fee_68500_at_200bps() -> None:
    """₦68,500 at 200bps = ₦1,370 exact (685000 × 200 / 10000 = 13700 kobo)."""
    fee = bankers_round(6850000, Decimal("200") / Decimal("10000"))
    assert fee == 137000


# ── Postings ─────────────────────────────────────────────────────────────


def test_post_escrowed_balanced() -> None:
    entries = post_escrowed("job-1", 15000)
    assert len(entries) == 2
    assert entries[0].account == "master"
    assert entries[0].debit_kobo == 15000
    assert entries[1].account == "client_liability:job-1"
    assert entries[1].credit_kobo == 15000
    assert_balanced(entries)


def test_post_released_balanced_and_fee() -> None:
    entries = post_released("job-2", 6850000, 200)
    assert_balanced(entries)
    fee_entry = next(e for e in entries if e.account == "fee_revenue")
    artisan_entry = next(e for e in entries if e.account == "artisan_payable:job-2")
    # Fee = 685000 kobo × 200 / 10000 = 137000 kobo = ₦1,370
    assert fee_entry.credit_kobo == 137000
    assert artisan_entry.credit_kobo == 6850000 - 137000
    # Debit side: client_liability pays full gross
    cl_entry = next(e for e in entries if e.account == "client_liability:job-2")
    assert cl_entry.debit_kobo == 6850000


def test_post_released_fee_plus_net_equals_gross() -> None:
    """For any gross_kobo and fee_bps: fee + net == gross."""
    test_cases = [
        (100000, 200),
        (6850000, 200),
        (999999, 150),
        (12345678, 350),
        (500000, 100),
    ]
    for gross_kobo, fee_bps in test_cases:
        entries = post_released(f"job-inv-{gross_kobo}", gross_kobo, fee_bps)
        assert_balanced(entries)
        fee_entry = next(e for e in entries if e.account == "fee_revenue")
        artisan_entry = next(
            e for e in entries if e.account.startswith("artisan_payable:")
        )
        assert fee_entry.credit_kobo + artisan_entry.credit_kobo == gross_kobo


def test_post_disbursement_balanced() -> None:
    entries = post_disbursement("job-3", 5330000)
    assert_balanced(entries)
    assert entries[0].account == "artisan_payable:job-3"
    assert entries[0].debit_kobo == 5330000
    assert entries[1].account == "master"
    assert entries[1].credit_kobo == 5330000


def test_post_refunded_balanced() -> None:
    entries = post_refunded("job-4", 120000)
    assert_balanced(entries)
    assert entries[0].account == "client_liability:job-4"
    assert entries[0].debit_kobo == 120000
    assert entries[1].account == "master"
    assert entries[1].credit_kobo == 120000


# ── Validation ───────────────────────────────────────────────────────────


def test_ledger_entry_rejects_negative_amount() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        LedgerEntry(account="master", debit_kobo=-1, credit_kobo=0, event_type="TEST")


def test_ledger_entry_rejects_both_zero() -> None:
    with pytest.raises(ValueError, match="Exactly one"):
        LedgerEntry(account="master", debit_kobo=0, credit_kobo=0, event_type="TEST")


def test_ledger_entry_rejects_both_nonzero() -> None:
    with pytest.raises(ValueError, match="Exactly one"):
        LedgerEntry(account="master", debit_kobo=100, credit_kobo=100, event_type="TEST")


def test_assert_balanced_raises_on_imbalance() -> None:
    entries = [
        LedgerEntry(account="a", debit_kobo=100, credit_kobo=0, event_type="TEST"),
        LedgerEntry(account="b", debit_kobo=0, credit_kobo=99, event_type="TEST"),
    ]
    with pytest.raises(LedgerError):
        assert_balanced(entries)
