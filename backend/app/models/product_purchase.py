import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProductPurchase(Base):
    __tablename__ = "product_purchases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    paystack_reference: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    download_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    download_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    max_downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3")
    download_verify_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    download_verify_window_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    download_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    refund_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship("Product", back_populates="purchases")
