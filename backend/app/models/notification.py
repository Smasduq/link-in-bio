import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

NOTIFICATION_TYPES = (
    "payment_success",
    "payment_failed",
    "subscription_cancelled",
    "renewal_upcoming",
    "renewal_failed",
    "access_expiring",
    "access_expired",
    "resubscribed",
    "trial_ending",
    "product_sale",
    "good_morning",
    "good_evening",
    "weekly_summary",
    "milestone_clicks",
    "inactivity_nudge",
    "admin_broadcast",
    # Referral wallet
    "referral_reward",
    "withdrawal_requested",
    "withdrawal_paid",
)

BILLING_NOTIFICATION_TYPES = frozenset({
    "payment_success",
    "payment_failed",
    "subscription_cancelled",
    "renewal_upcoming",
    "renewal_failed",
    "access_expiring",
    "access_expired",
    "resubscribed",
    "trial_ending",
    "product_sale",
    # Wallet events are billing-category so they respect email_billing_enabled preference.
    "referral_reward",
    "withdrawal_requested",
    "withdrawal_paid",
})

ENGAGEMENT_NOTIFICATION_TYPES = frozenset({
    "good_morning",
    "good_evening",
    "weekly_summary",
    "milestone_clicks",
    "inactivity_nudge",
    "admin_broadcast",
})


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
