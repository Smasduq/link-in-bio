"""Admin user management — list, detail, grant/revoke, suspend, soft delete."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.admin_audit_log import AdminAuditLog
from app.models.analytics import LinkClick, PageView
from app.models.billing_event import BillingEvent
from app.models.link import Link
from app.models.product import Product
from app.models.profile import Profile
from app.models.user import User
from app.services.admin_audit import log_admin_action
from app.services.avatar import resolve_profile_avatar_url
from app.services.billing import (
    PLAN_PERIOD_DAYS,
    activate_manual_premium,
    billing_history_payload,
    get_current_user_premium_status,
    log_billing_event,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _not_deleted(query):
    return query.filter(User.deleted_at.is_(None))


def list_users(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[User], int]:
    query = _not_deleted(db.query(User)).options(joinedload(User.profile))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.outerjoin(Profile, Profile.user_id == User.id).filter(
            or_(
                func.lower(User.email).like(term),
                func.lower(Profile.username).like(term),
            )
        )

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return users, total


def get_user_or_404(db: Session, user_id: str) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.profile))
        .filter(User.id == user_id, User.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def serialize_user_list_item(user: User) -> dict[str, Any]:
    premium = get_current_user_premium_status(user)
    plan_label = "pro" if premium["is_premium"] else "free"
    if premium.get("is_trial"):
        plan_label = "trial"

    return {
        "id": user.id,
        "email": user.email,
        "username": user.profile.username if user.profile else None,
        "plan_status": plan_label,
        "is_suspended": user.is_suspended,
        "role": user.role,
        "signup_date": user.created_at,
        "last_active": user.last_login_at,
    }


def get_user_detail(db: Session, user_id: str) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)
    profile = user.profile
    premium = get_current_user_premium_status(user)

    links = db.query(Link).filter(Link.user_id == user.id).order_by(Link.position).all()
    products: list[Product] = []
    if profile:
        products = (
            db.query(Product)
            .filter(Product.profile_id == profile.id)
            .order_by(Product.position)
            .all()
        )

    embeds = [link for link in links if link.type in {"youtube_embed", "spotify_embed"}]
    regular_links = [link for link in links if link.type == "link"]

    page_views = 0
    if profile:
        page_views = db.query(PageView).filter(PageView.profile_id == profile.id).count()

    link_clicks = (
        db.query(func.coalesce(func.sum(Link.click_count), 0))
        .filter(Link.user_id == user.id)
        .scalar()
    )

    billing_events = (
        db.query(BillingEvent)
        .filter(BillingEvent.user_id == user.id)
        .order_by(BillingEvent.created_at.desc())
        .limit(50)
        .all()
    )

    admin_actions = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_id == user.id)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(30)
        .all()
    )

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_suspended": user.is_suspended,
            "suspended_at": user.suspended_at,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "email_verified_at": user.email_verified_at,
        },
        "profile": {
            "username": profile.username if profile else None,
            "full_name": profile.full_name if profile else None,
            "bio": profile.bio if profile else None,
            "avatar_url": resolve_profile_avatar_url(profile) if profile else None,
            "public_url_username": profile.username if profile else None,
        },
        "premium": premium,
        "billing_history": billing_history_payload(db, user.id),
        "stats": {
            "page_views": page_views,
            "link_clicks": int(link_clicks or 0),
            "links_count": len(regular_links),
            "embeds_count": len(embeds),
            "products_count": len(products),
        },
        "links": [
            {
                "id": link.id,
                "title": link.title,
                "url": link.url,
                "type": link.type,
                "is_active": link.is_active,
                "click_count": link.click_count,
            }
            for link in regular_links
        ],
        "embeds": [
            {
                "id": link.id,
                "title": link.title,
                "url": link.url,
                "type": link.type,
                "is_active": link.is_active,
            }
            for link in embeds
        ],
        "products": [
            {
                "id": product.id,
                "title": product.title,
                "price": product.price,
                "is_active": product.is_active,
                "created_at": product.created_at,
            }
            for product in products
        ],
        "billing_events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "paystack_reference": event.paystack_reference,
                "created_at": event.created_at,
            }
            for event in billing_events
        ],
        "admin_activity": [
            {
                "id": log.id,
                "action": log.action,
                "admin_user_id": log.admin_user_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in admin_actions
        ],
    }


def grant_pro(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
    plan: Literal["monthly", "yearly"] = "monthly",
    days: int | None = None,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)
    period_days = days if days is not None else PLAN_PERIOD_DAYS.get(plan, 30)

    user.is_trial = False
    activate_manual_premium(db, user, plan=plan, reference=f"admin-grant-{admin.id[:8]}")
    if days is not None:
        user.premium_period_end = _utcnow() + timedelta(days=period_days)

    log_billing_event(
        db,
        event_type="admin.grant_pro",
        user_id=user.id,
        payload={"reason": reason, "plan": plan, "days": period_days, "admin_id": admin.id},
    )
    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="grant_pro",
        target_type="user",
        target_id=user.id,
        details={"reason": reason, "plan": plan, "days": period_days},
    )
    db.commit()
    db.refresh(user)
    return {"premium": get_current_user_premium_status(user)}


def revoke_pro(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)

    user.is_premium = False
    user.is_trial = False
    user.premium_plan = None
    user.premium_period_end = _utcnow()
    user.premium_grace_until = None
    user.subscription_status = "cancelled"
    user.paystack_subscription_code = None
    user.paystack_email_token = None
    user.renewal_type = None

    log_billing_event(
        db,
        event_type="admin.revoke_pro",
        user_id=user.id,
        payload={"reason": reason, "admin_id": admin.id},
    )
    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="revoke_pro",
        target_type="user",
        target_id=user.id,
        details={"reason": reason},
    )
    db.commit()
    db.refresh(user)
    return {"premium": get_current_user_premium_status(user)}


def suspend_user(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend your own account")

    user.is_suspended = True
    user.suspended_at = _utcnow()

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="suspend_user",
        target_type="user",
        target_id=user.id,
        details={"reason": reason},
    )
    db.commit()
    return {"is_suspended": True, "suspended_at": user.suspended_at}


def reactivate_user(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)

    user.is_suspended = False
    user.suspended_at = None

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="reactivate_user",
        target_type="user",
        target_id=user.id,
        details={"reason": reason},
    )
    db.commit()
    return {"is_suspended": False}


def soft_delete_user(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
    confirm_username: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    username = (user.profile.username if user.profile else "").lower()
    if username != confirm_username.strip().lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username confirmation does not match")

    user.deleted_at = _utcnow()
    user.is_suspended = True
    user.is_premium = False
    user.is_trial = False
    user.subscription_status = "cancelled"

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="soft_delete_user",
        target_type="user",
        target_id=user.id,
        details={"reason": reason, "username": username},
    )
    db.commit()
    return {"deleted": True, "deleted_at": user.deleted_at}
