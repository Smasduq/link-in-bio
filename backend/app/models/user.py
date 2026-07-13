import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    premium_plan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    premium_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paystack_subscription_code: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    paystack_customer_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paystack_email_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    premium_grace_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    renewal_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    manual_renewal_reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_paystack_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_morning_notification_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_evening_notification_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_weekly_summary_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_inactivity_nudge_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clicks_milestone_sent: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_trial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user", server_default="user")
    is_suspended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    manual_pro_grant: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    manual_pro_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    links: Mapped[list["Link"]] = relationship("Link", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def is_staff(self) -> bool:
        return self.role in {"support", "admin"}

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
