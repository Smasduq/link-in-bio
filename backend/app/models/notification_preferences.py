from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    email_billing_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    email_engagement_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    push_billing_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    push_engagement_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
