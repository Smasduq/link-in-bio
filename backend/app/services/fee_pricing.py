"""Fee-inclusive Paystack pricing (Option B — manual calculation)."""

from __future__ import annotations

# Paystack Nigeria: 1.5% + 7.5% VAT on the fee.
# Transactions with total_charge ≤ ₦2,500 waive the ₦100 flat fee.
PAYSTACK_RATE = 0.015
VAT_RATE = 0.075
PAYSTACK_FLAT_FEE = 100.0
FLAT_FEE_WAIVED_MAX_TOTAL = 2500.0


def _fee_divisor() -> float:
    return 1 - (PAYSTACK_RATE * (1 + VAT_RATE))


def calculate_fee_inclusive_amount(base_amount: float) -> dict[str, float]:
    """
    Compute the customer-facing total so the merchant nets ``base_amount`` after
    Paystack's percentage fee, optional ₦100 flat fee, and VAT on fees.
    """
    divisor = _fee_divisor()

    # Try the sub-₦2,500 bracket first (flat fee waived).
    total_low = round(base_amount / divisor, 2)
    if total_low <= FLAT_FEE_WAIVED_MAX_TOTAL:
        service_fee = round(total_low * PAYSTACK_RATE, 2)
        vat_on_fee = round(service_fee * VAT_RATE, 2)
        return {
            "base_amount": base_amount,
            "flat_fee": 0.0,
            "service_fee": service_fee,
            "vat_on_fee": vat_on_fee,
            "total_charge": total_low,
        }

    # Above ₦2,500 — include ₦100 flat fee + VAT on the full Paystack fee.
    flat_fee = PAYSTACK_FLAT_FEE
    total_charge = round((base_amount + flat_fee * (1 + VAT_RATE)) / divisor, 2)
    service_fee = round(total_charge * PAYSTACK_RATE, 2)
    vat_on_fee = round((service_fee + flat_fee) * VAT_RATE, 2)

    return {
        "base_amount": base_amount,
        "flat_fee": flat_fee,
        "service_fee": service_fee,
        "vat_on_fee": vat_on_fee,
        "total_charge": total_charge,
    }


def total_charge_kobo(base_amount: float) -> int:
    pricing = calculate_fee_inclusive_amount(base_amount)
    return int(round(pricing["total_charge"] * 100))


def net_received(pricing: dict[str, float]) -> float:
    flat_fee = pricing.get("flat_fee", 0.0)
    return round(
        pricing["total_charge"] - pricing["service_fee"] - pricing["vat_on_fee"] - flat_fee,
        2,
    )
