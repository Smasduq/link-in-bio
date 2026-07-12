import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

DEFAULT_THEME = {
    "backgroundType": "solid",
    "background": "#0a0a0f",
    "textColor": "#ffffff",
    "buttonStyle": "filled",
    "fontDisplay": "DM Sans",
    "fontBody": "DM Sans",
    "accentColor": "#6366f1",
}


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_version: Mapped[int | None] = mapped_column(nullable=True)
    social_links: Mapped[list] = mapped_column(JSON, default=lambda: [], nullable=False)
    email_capture_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    email_capture_heading: Mapped[str | None] = mapped_column(String(120), nullable=True)
    announcement_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    announcement_text: Mapped[str | None] = mapped_column(String(150), nullable=True)
    theme_settings: Mapped[dict] = mapped_column(JSON, default=DEFAULT_THEME, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
    page_views: Mapped[list["PageView"]] = relationship("PageView", back_populates="profile", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="profile", cascade="all, delete-orphan")
    subscribers: Mapped[list["Subscriber"]] = relationship(
        "Subscriber", back_populates="profile", cascade="all, delete-orphan"
    )
