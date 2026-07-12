from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FeeBreakdown(BaseModel):
    base_amount: float
    service_fee: float
    vat_on_fee: float
    total_charge: float
    total_charge_kobo: int


class PlanPricingItem(BaseModel):
    slug: str
    name: str
    interval: str
    base_amount: float
    service_fee: float
    vat_on_fee: float
    total_charge: float
    total_charge_kobo: int
    paystack_plan_code: str | None = None
    yearly_savings_percent: float | None = None
    yearly_savings_amount: float | None = None


class PlanPricingResponse(BaseModel):
    plans: list[PlanPricingItem]


class InitializeBillingRequest(BaseModel):
    plan: Literal["monthly", "yearly"] = Field(description="Billing interval")


class InitializeBillingResponse(BaseModel):
    access_code: str
    reference: str
    authorization_url: str
    plan: str
    public_key: str
    pricing: FeeBreakdown


class BillingStatusResponse(BaseModel):
    plan: str
    is_premium: bool
    premium_until: datetime | None = None
    monthly_base_amount_ngn: float | None = None
    yearly_base_amount_ngn: float | None = None
    yearly_savings_percent: float | None = None
    yearly_savings_amount: float | None = None
    paystack_public_key: str | None = None
