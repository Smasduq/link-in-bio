import pytest

from app.config import settings
from app.services.fee_pricing import calculate_fee_inclusive_amount, net_received


def test_yearly_base_is_15_percent_off_twelve_months():
    assert settings.paystack_monthly_base_amount_ngn == 500
    assert settings.paystack_yearly_discount_percent == 15
    assert settings.paystack_yearly_base_amount_ngn == 5100


def test_fee_inclusive_amount_for_500_base():
    pricing = calculate_fee_inclusive_amount(500)

    assert pricing["base_amount"] == 500
    assert pricing["flat_fee"] == 0.0
    assert pricing["total_charge"] == pytest.approx(508.20, abs=0.02)
    assert pricing["service_fee"] == pytest.approx(7.62, abs=0.01)
    assert pricing["vat_on_fee"] == pytest.approx(0.57, abs=0.01)
    assert net_received(pricing) == pytest.approx(500, abs=0.05)


def test_total_charge_kobo_for_500_base():
    pricing = calculate_fee_inclusive_amount(500)
    assert int(round(pricing["total_charge"] * 100)) == 50819


def test_fee_inclusive_amount_for_5100_yearly_base():
    pricing = calculate_fee_inclusive_amount(5100)

    assert pricing["flat_fee"] == 100.0
    assert pricing["total_charge"] == pytest.approx(5292.85, abs=0.05)
    assert net_received(pricing) == pytest.approx(5100, abs=0.10)
