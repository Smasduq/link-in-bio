"""Admin content moderation — products and reports."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.content_report import ContentReport
from app.models.product import Product
from app.models.profile import Profile
from app.models.user import User
from app.services.admin_audit import log_admin_action


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_all_products(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    query = db.query(Product).options(joinedload(Product.profile).joinedload(Profile.user))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.join(Profile, Profile.id == Product.profile_id).filter(
            func.lower(Product.title).like(term) | func.lower(Profile.username).like(term)
        )

    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    rows = []
    for product in products:
        profile = product.profile
        rows.append(
            {
                "id": product.id,
                "title": product.title,
                "price": product.price,
                "is_active": product.is_active,
                "username": profile.username if profile else None,
                "user_id": profile.user_id if profile else None,
                "created_at": product.created_at,
            }
        )
    return rows, total


def disable_product(
    db: Session,
    *,
    admin: User,
    product_id: str,
    reason: str,
) -> dict[str, Any]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.add(product)
    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="disable_product",
        target_type="product",
        target_id=product.id,
        details={"reason": reason, "title": product.title},
    )
    db.commit()
    return {"id": product.id, "is_active": False}


def create_report(
    db: Session,
    *,
    reporter_email: str,
    target_type: Literal["profile", "product"],
    target_id: str,
    reason: str,
) -> ContentReport:
    if target_type == "profile":
        exists = db.query(Profile.id).filter(Profile.id == target_id).first()
    else:
        exists = db.query(Product.id).filter(Product.id == target_id).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report target not found")

    report = ContentReport(
        reporter_email=reporter_email.strip().lower(),
        target_type=target_type,
        target_id=target_id,
        reason=reason.strip(),
        status="open",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_reports(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = "open",
) -> tuple[list[dict[str, Any]], int]:
    query = db.query(ContentReport)
    if status_filter:
        query = query.filter(ContentReport.status == status_filter)
    total = query.count()
    reports = query.order_by(ContentReport.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    rows = []
    for report in reports:
        target_label = report.target_id
        if report.target_type == "profile":
            profile = db.query(Profile).filter(Profile.id == report.target_id).first()
            target_label = profile.username if profile else report.target_id
        elif report.target_type == "product":
            product = db.query(Product).filter(Product.id == report.target_id).first()
            target_label = product.title if product else report.target_id

        rows.append(
            {
                "id": report.id,
                "reporter_email": report.reporter_email,
                "target_type": report.target_type,
                "target_id": report.target_id,
                "target_label": target_label,
                "reason": report.reason,
                "status": report.status,
                "created_at": report.created_at,
            }
        )
    return rows, total


def resolve_report(
    db: Session,
    *,
    admin: User,
    report_id: str,
    action: Literal["resolve", "dismiss"],
    reason: str,
) -> dict[str, Any]:
    report = db.query(ContentReport).filter(ContentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = "resolved" if action == "resolve" else "dismissed"
    report.resolved_at = _utcnow()
    report.resolved_by = admin.id
    db.add(report)

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action=f"report_{action}",
        target_type="report",
        target_id=report.id,
        details={"reason": reason, "target_type": report.target_type, "target_id": report.target_id},
    )
    db.commit()
    return {"id": report.id, "status": report.status}
