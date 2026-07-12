from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class ProductCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price: float = Field(gt=0, le=10_000_000)


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    price: float | None = Field(default=None, gt=0, le=10_000_000)
    is_active: bool | None = None
    position: int | None = Field(default=None, ge=0)


class ProductReorderItem(BaseModel):
    id: str
    position: int


class ProductReorderRequest(BaseModel):
    products: list[ProductReorderItem]


class ProductResponse(BaseModel):
    id: str
    profile_id: str
    title: str
    description: str | None = None
    price: float
    total_charge: float
    cover_image_url: str | None = None
    file_name: str
    position: int = 0
    is_active: bool
    sales_count: int = 0
    revenue: float = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicProductResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    price: float
    total_charge: float
    cover_image_url: str | None = None
    file_name: str


class PurchaseInitializeRequest(BaseModel):
    buyer_email: EmailStr


class PurchaseInitializeResponse(BaseModel):
    access_code: str
    reference: str
    authorization_url: str
    public_key: str
    product_id: str
    buyer_email: str
    pricing: dict


class PurchaseVerifyResponse(BaseModel):
    status: Literal["success", "failed", "pending"]
    reference: str
    buyer_email: str | None = None
    product_title: str | None = None
    download_url: str | None = None
    email_sent: bool = False


class ProductSaleResponse(BaseModel):
    id: str
    product_id: str
    product_title: str
    buyer_email: str
    amount_paid: float
    paystack_reference: str
    download_count: int
    download_flagged: bool
    created_at: datetime
