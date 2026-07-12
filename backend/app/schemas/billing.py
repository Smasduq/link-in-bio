from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class InitializeBillingRequest(BaseModel):
    plan: Literal["monthly", "yearly"] = Field(description="Billing interval")


class InitializeBillingResponse(BaseModel):
    access_code: str
    reference: str
    authorization_url: str
    amount_ngn: int
    plan: str
    public_key: str


class BillingStatusResponse(BaseModel):
    plan: str
    is_premium: bool
    premium_until: datetime | None = None
    monthly_amount_ngn: int
    yearly_amount_ngn: int
    paystack_public_key: str | None = None
