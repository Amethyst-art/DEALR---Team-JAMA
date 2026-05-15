from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal

from app.core.errors import DealrError


class LedgerError(DealrError):
    def __init__(
        self, message: str = "Ledger imbalance", *, details: dict[str, object] | None = None
    ) -> None:
        super().__init__(message, details=details)


@dataclass(frozen=True)
class LedgerEntry:
    account: str
    debit_kobo: int
    credit_kobo: int
    event_type: str

    def __post_init__(self) -> None:
        if self.debit_kobo < 0 or self.credit_kobo < 0:
            raise ValueError("Ledger amounts must be non-negative")
        if bool(self.debit_kobo) == bool(self.credit_kobo):
            raise ValueError("Exactly one of debit_kobo or credit_kobo must be non-zero")


def bankers_round(kobo: int, fraction: Decimal) -> int:
    amount = Decimal(kobo) * fraction
    rounded = amount.quantize(Decimal("1"), rounding=ROUND_HALF_EVEN)
    return int(rounded)


def assert_balanced(entries: list[LedgerEntry]) -> None:
    total_debit = sum(entry.debit_kobo for entry in entries)
    total_credit = sum(entry.credit_kobo for entry in entries)
    if total_debit != total_credit:
        raise LedgerError(
            "Ledger entries are not balanced",
            details={"debit": total_debit, "credit": total_credit},
        )


def post_escrowed(job_id: str, gross_kobo: int) -> list[LedgerEntry]:
    entries = [
        LedgerEntry(account="master", debit_kobo=gross_kobo, credit_kobo=0, event_type="ESCROWED"),
        LedgerEntry(
            account=f"client_liability:{job_id}",
            debit_kobo=0,
            credit_kobo=gross_kobo,
            event_type="ESCROWED",
        ),
    ]
    assert_balanced(entries)
    return entries


def post_released(job_id: str, gross_kobo: int, fee_bps: int) -> list[LedgerEntry]:
    fee = bankers_round(gross_kobo, Decimal(fee_bps) / Decimal(10000))
    net = gross_kobo - fee
    entries = [
        LedgerEntry(
            account=f"client_liability:{job_id}",
            debit_kobo=gross_kobo,
            credit_kobo=0,
            event_type="RELEASED",
        ),
        LedgerEntry(account="fee_revenue", debit_kobo=0, credit_kobo=fee, event_type="RELEASED"),
        LedgerEntry(
            account=f"artisan_payable:{job_id}",
            debit_kobo=0,
            credit_kobo=net,
            event_type="RELEASED",
        ),
    ]
    assert_balanced(entries)
    return entries


def post_disbursement(job_id: str, net_kobo: int) -> list[LedgerEntry]:
    entries = [
        LedgerEntry(
            account=f"artisan_payable:{job_id}",
            debit_kobo=net_kobo,
            credit_kobo=0,
            event_type="DISBURSEMENT",
        ),
        LedgerEntry(
            account="master", debit_kobo=0, credit_kobo=net_kobo, event_type="DISBURSEMENT"
        ),
    ]
    assert_balanced(entries)
    return entries


def post_refunded(job_id: str, gross_kobo: int) -> list[LedgerEntry]:
    entries = [
        LedgerEntry(
            account=f"client_liability:{job_id}",
            debit_kobo=gross_kobo,
            credit_kobo=0,
            event_type="REFUNDED",
        ),
        LedgerEntry(account="master", debit_kobo=0, credit_kobo=gross_kobo, event_type="REFUNDED"),
    ]
    assert_balanced(entries)
    return entries
