"""Admin user management — list, detail, grant/revoke, suspend, soft delete."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

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
    billing_history_payload,
    get_current_user_premium_status,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _has_active_paystack_subscription(user: User) -> bool:
    if not user.paystack_subscription_code:
        return False
    return user.subscription_status in {None, "active", "past_due", "cancelled"}


def _pro_status_label(user: User, premium: dict[str, Any]) -> str:
    if not premium.get("is_premium"):
        return "free"
    if user.manual_pro_grant:
        return "pro_manual"
    return "pro_paid"


def _serialize_admin_activity(db: Session, logs: list[AdminAuditLog]) -> list[dict[str, Any]]:
    if not logs:
        return []
    admin_ids = {log.admin_user_id for log in logs}
    admin_emails = {
        row.id: row.email for row in db.query(User).filter(User.id.in_(admin_ids)).all()
    }
    rows = []
    for log in logs:
        rows.append(
            {
                "id": log.id,
                "action": log.action,
                "admin_user_id": log.admin_user_id,
                "admin_email": admin_emails.get(log.admin_user_id),
                "details": log.details,
                "created_at": log.created_at,
            }
        )
    return rows


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
        .filter(AdminAuditLog.target_type == "user", AdminAuditLog.target_id == user.id)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(30)
        .all()
    )
    pro_status = _pro_status_label(user, premium)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_suspended": user.is_suspended,
            "suspended_at": user.suspended_at,
            "suspended_reason": user.suspended_reason,
            "manual_pro_grant": user.manual_pro_grant,
            "manual_pro_reason": user.manual_pro_reason,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "email_verified_at": user.email_verified_at,
            "paystack_subscription_code": user.paystack_subscription_code,
            "subscription_status": user.subscription_status,
        },
        "profile": {
            "username": profile.username if profile else None,
            "full_name": profile.full_name if profile else None,
            "bio": profile.bio if profile else None,
            "avatar_url": resolve_profile_avatar_url(profile) if profile else None,
            "public_url_username": profile.username if profile else None,
            "profile_disabled": profile.profile_disabled if profile else False,
        },
        "premium": {
            **premium,
            "pro_status": pro_status,
            "pro_status_label": {
                "free": "Free",
                "pro_manual": "Pro — Manual Grant",
                "pro_paid": "Pro — Paid",
            }.get(pro_status, "Free"),
        },
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
        "admin_activity": _serialize_admin_activity(db, admin_actions),
    }


def grant_pro(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)

    user.is_premium = True
    user.manual_pro_grant = True
    user.manual_pro_reason = reason.strip()
    user.is_trial = False
    user.premium_period_end = _utcnow() + timedelta(days=3650)
    if not user.premium_plan:
        user.premium_plan = "monthly"
    db.add(user)

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="grant_pro",
        target_type="user",
        target_id=user.id,
        details={"reason": reason.strip()},
    )
    db.commit()
    db.refresh(user)
    premium = get_current_user_premium_status(user)
    return {
        "premium": premium,
        "pro_status": _pro_status_label(user, premium),
    }


def revoke_pro(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)

    user.is_premium = False
    user.manual_pro_grant = False
    user.manual_pro_reason = None
    db.add(user)

    warning = None
    if _has_active_paystack_subscription(user) and user.subscription_status in {None, "active", "past_due"}:
        warning = (
            "Manual Pro access was revoked, but this user still has an active Paystack subscription. "
            "Revoking here does not cancel their billing — disable the Paystack subscription separately "
            "if you intend a full removal."
        )

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="revoke_pro",
        target_type="user",
        target_id=user.id,
        details={"reason": reason.strip()},
    )
    db.commit()
    db.refresh(user)
    premium = get_current_user_premium_status(user)
    result: dict[str, Any] = {
        "premium": premium,
        "pro_status": _pro_status_label(user, premium),
    }
    if warning:
        result["warning"] = warning
    return result


def suspend_user(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
    disable_public_profile: bool = False,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend your own account")

    user.is_suspended = True
    user.suspended_reason = reason.strip()
    user.suspended_at = _utcnow()
    db.add(user)

    profile_disabled = False
    if disable_public_profile and user.profile:
        user.profile.profile_disabled = True
        db.add(user.profile)
        profile_disabled = True

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="suspend_user",
        target_type="user",
        target_id=user.id,
        details={"reason": reason.strip(), "disable_public_profile": profile_disabled},
    )
    db.commit()
    return {
        "is_suspended": True,
        "suspended_at": user.suspended_at,
        "suspended_reason": user.suspended_reason,
        "profile_disabled": profile_disabled,
    }


def reactivate_user(
    db: Session,
    *,
    admin: User,
    user_id: str,
    reason: str,
) -> dict[str, Any]:
    user = get_user_or_404(db, user_id)

    user.is_suspended = False
    user.suspended_reason = None
    user.suspended_at = None
    db.add(user)

    profile_reenabled = False
    if user.profile and user.profile.profile_disabled:
        user.profile.profile_disabled = False
        db.add(user.profile)
        profile_reenabled = True

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="reactivate_user",
        target_type="user",
        target_id=user.id,
        details={"reason": reason.strip(), "profile_reenabled": profile_reenabled},
    )
    db.commit()
    return {"is_suspended": False, "profile_disabled": False}


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
