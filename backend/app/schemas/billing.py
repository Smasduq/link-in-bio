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


class VerifyTransactionResponse(BaseModel):
    status: Literal["success", "failed", "abandoned"]
    reference: str
    gateway_response: str | None = None
    is_premium: bool = False
    premium_until: datetime | None = None


class CancelBillingResponse(BaseModel):
    subscription_status: Literal["cancelled"]
    premium_until: datetime | None = None
    message: str


class BillingStatusResponse(BaseModel):
    plan: str
    is_premium: bool
    premium_until: datetime | None = None
    subscription_status: str | None = None
    can_cancel: bool = False
    is_cancelled_pending_expiry: bool = False
    monthly_base_amount_ngn: float | None = None
    yearly_base_amount_ngn: float | None = None
    yearly_savings_percent: float | None = None
    yearly_savings_amount: float | None = None
    paystack_public_key: str | None = None
