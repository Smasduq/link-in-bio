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
    pass


class AdminSuspendRequest(AdminActionRequest):
    disable_public_profile: bool = False


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


class AdminTransactionItem(BaseModel):
    id: str
    reference: str
    user_id: str | None = None
    user_email: str | None = None
    username: str | None = None
    amount_ngn: float
    status: str
    type: str
    date: datetime
    buyer_email: str | None = None
    product_title: str | None = None


class AdminTransactionListResponse(BaseModel):
    items: list[AdminTransactionItem]
    total: int
    page: int
    page_size: int


class AdminRefundRequest(AdminActionRequest):
    reference: str = Field(min_length=3, max_length=255)


class AdminSubscriptionItem(BaseModel):
    user_id: str
    email: str
    username: str | None
    plan: str
    subscription_status: str | None
    premium_until: datetime | None
    is_trial: bool
    paystack_subscription_code: str | None


class AdminSubscriptionListResponse(BaseModel):
    items: list[AdminSubscriptionItem]
    total: int
    page: int
    page_size: int


class AdminWebhookEventItem(BaseModel):
    id: str
    event_type: str
    paystack_reference: str | None
    user_id: str | None
    processing_status: str
    processing_error: str | None
    created_at: datetime
    payload: dict[str, Any]


class AdminWebhookListResponse(BaseModel):
    items: list[AdminWebhookEventItem]
    total: int
    page: int
    page_size: int


class AdminProductItem(BaseModel):
    id: str
    title: str
    price: float
    is_active: bool
    username: str | None
    user_id: str | None
    created_at: datetime


class AdminProductListResponse(BaseModel):
    items: list[AdminProductItem]
    total: int
    page: int
    page_size: int


class AdminReportItem(BaseModel):
    id: str
    reporter_email: str
    target_type: str
    target_id: str
    target_label: str | None
    reason: str
    status: str
    created_at: datetime


class AdminReportListResponse(BaseModel):
    items: list[AdminReportItem]
    total: int
    page: int
    page_size: int


class AdminReportActionRequest(AdminActionRequest):
    action: Literal["resolve", "dismiss"]


class AdminBroadcastRequest(BaseModel):
    message: str = Field(min_length=3, max_length=2000)
    subject: str | None = Field(default=None, max_length=120)


class AdminCronRunItem(BaseModel):
    id: str
    job_name: str
    status: str
    details: dict[str, Any]
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None


class AdminCronRunListResponse(BaseModel):
    items: list[AdminCronRunItem]


class AdminFeatureFlagItem(BaseModel):
    key: str
    value: Any
    description: str | None
    updated_at: datetime | None


class AdminFeatureFlagListResponse(BaseModel):
    items: list[AdminFeatureFlagItem]


class AdminFeatureFlagUpdateRequest(BaseModel):
    value: Any
