import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PageView(Base):
    __tablename__ = "page_views"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    referrer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    device_type: Mapped[str] = mapped_column(String(20), default="desktop", nullable=False)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    visitor_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    profile: Mapped["Profile"] = relationship("Profile", back_populates="page_views")


class LinkClick(Base):
    __tablename__ = "link_clicks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    link_id: Mapped[str] = mapped_column(String(36), ForeignKey("links.id", ondelete="CASCADE"), index=True, nullable=False)
    referrer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    device_type: Mapped[str] = mapped_column(String(20), default="desktop", nullable=False)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    visitor_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    link: Mapped["Link"] = relationship("Link", back_populates="clicks")
