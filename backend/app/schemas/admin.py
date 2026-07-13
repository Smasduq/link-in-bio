from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AdminOverviewMetrics(BaseModel):
    total_users: int
    free_users: int
    pro_users: int
    mrr_ngn: float
    signups_today: int
    signups_this_week: int
    cancellations_this_week: int
    page_views_30d: int
    link_clicks_30d: int
    recent_product_sales_count: int


class AdminSignupActivity(BaseModel):
    id: str
    email: str
    username: str | None
    created_at: datetime


class AdminCancellationActivity(BaseModel):
    user_id: str | None
    email: str | None
    username: str | None
    event_type: str
    cancelled_at: datetime


class AdminSaleActivity(BaseModel):
    id: str
    product_id: str
    product_title: str | None
    seller_username: str | None
    buyer_email: str
    amount_paid: float
    created_at: datetime


class AdminRecentActivity(BaseModel):
    recent_signups: list[AdminSignupActivity]
    recent_cancellations: list[AdminCancellationActivity]
    recent_product_sales: list[AdminSaleActivity]


class AdminOverviewResponse(BaseModel):
    metrics: AdminOverviewMetrics
    activity: AdminRecentActivity


class AdminUserListItem(BaseModel):
    id: str
    email: str
    username: str | None
    plan_status: str
    is_suspended: bool
    role: str
    signup_date: datetime
    last_active: datetime | None


class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItem]
    total: int
    page: int
    page_size: int


class AdminActionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class AdminGrantProRequest(AdminActionRequest):
    plan: Literal["monthly", "yearly"] = "monthly"
    days: int | None = Field(default=None, ge=1, le=3650)


class AdminDeleteUserRequest(AdminActionRequest):
    confirm_username: str = Field(min_length=1, max_length=50)


class AdminUserDetailResponse(BaseModel):
    user: dict[str, Any]
    profile: dict[str, Any]
    premium: dict[str, Any]
    billing_history: list[dict[str, Any]]
    stats: dict[str, Any]
    links: list[dict[str, Any]]
    embeds: list[dict[str, Any]]
    products: list[dict[str, Any]]
    billing_events: list[dict[str, Any]]
    admin_activity: list[dict[str, Any]]


class AdminActionResponse(BaseModel):
    message: str
    data: dict[str, Any] | None = None
