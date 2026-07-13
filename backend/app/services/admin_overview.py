"""Admin overview metrics and activity feed."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.analytics import LinkClick, PageView
from app.models.billing_event import BillingEvent
from app.models.billing_plan import BillingPlanRecord
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.profile import Profile
from app.models.user import User
from app.services.billing import get_current_user_premium_status


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _active_users_query(db: Session):
    return db.query(User).filter(User.deleted_at.is_(None))


def get_overview_metrics(db: Session) -> dict:
    now = _utcnow()
    today_start = _start_of_day(now)
    week_start = today_start - timedelta(days=today_start.weekday())

    users = _active_users_query(db)
    total_users = users.count()

    pro_count = 0
    for user in users.filter(User.is_premium.is_(True)).all():
        status = get_current_user_premium_status(user)
        if status["is_premium"]:
            pro_count += 1

    free_count = total_users - pro_count

    plan_charges = {
        row.slug: float(row.total_charge)
        for row in db.query(BillingPlanRecord).all()
    }
    mrr = 0.0
    for user in users.filter(User.is_premium.is_(True)).all():
        status = get_current_user_premium_status(user)
        if not status["is_premium"]:
            continue
        if user.manual_pro_grant:
            continue
        plan = status.get("plan") or user.premium_plan
        if plan == "monthly":
            mrr += plan_charges.get("monthly", 0.0)
        elif plan == "yearly":
            mrr += plan_charges.get("yearly", 0.0) / 12

    signups_today = users.filter(User.created_at >= today_start).count()
    signups_this_week = users.filter(User.created_at >= week_start).count()

    cancellation_types = ("subscription.disable", "subscription.not_renew")
    cancellations_this_week = (
        db.query(BillingEvent)
        .filter(
            BillingEvent.event_type.in_(cancellation_types),
            BillingEvent.created_at >= week_start,
        )
        .count()
    )

    thirty_days_ago = now - timedelta(days=30)
    page_views_30d = db.query(PageView).filter(PageView.viewed_at >= thirty_days_ago).count()
    link_clicks_30d = db.query(LinkClick).filter(LinkClick.clicked_at >= thirty_days_ago).count()

    recent_sales = (
        db.query(ProductPurchase)
        .order_by(ProductPurchase.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "total_users": total_users,
        "free_users": free_count,
        "pro_users": pro_count,
        "mrr_ngn": round(mrr, 2),
        "signups_today": signups_today,
        "signups_this_week": signups_this_week,
        "cancellations_this_week": cancellations_this_week,
        "page_views_30d": page_views_30d,
        "link_clicks_30d": link_clicks_30d,
        "recent_product_sales_count": len(recent_sales),
    }


def get_recent_activity(db: Session) -> dict:
    users = _active_users_query(db)

    recent_signups = (
        users.options(joinedload(User.profile))
        .order_by(User.created_at.desc())
        .limit(20)
        .all()
    )

    cancellation_types = ("subscription.disable", "subscription.not_renew")
    cancel_events = (
        db.query(BillingEvent)
        .filter(BillingEvent.event_type.in_(cancellation_types))
        .order_by(BillingEvent.created_at.desc())
        .limit(20)
        .all()
    )
    cancel_user_ids = {e.user_id for e in cancel_events if e.user_id}
    cancel_users = {}
    if cancel_user_ids:
        for u in db.query(User).options(joinedload(User.profile)).filter(User.id.in_(cancel_user_ids)).all():
            cancel_users[u.id] = u

    recent_cancellations = []
    for event in cancel_events:
        user = cancel_users.get(event.user_id) if event.user_id else None
        recent_cancellations.append(
            {
                "user_id": event.user_id,
                "email": user.email if user else None,
                "username": user.profile.username if user and user.profile else None,
                "event_type": event.event_type,
                "cancelled_at": event.created_at,
            }
        )

    recent_sales = (
        db.query(ProductPurchase)
        .options(joinedload(ProductPurchase.product).joinedload(Product.profile))
        .order_by(ProductPurchase.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "recent_signups": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.profile.username if u.profile else None,
                "created_at": u.created_at,
            }
            for u in recent_signups
        ],
        "recent_cancellations": recent_cancellations,
        "recent_product_sales": [
            {
                "id": p.id,
                "product_id": p.product_id,
                "product_title": p.product.title if p.product else None,
                "seller_username": p.product.profile.username if p.product and p.product.profile else None,
                "buyer_email": p.buyer_email,
                "amount_paid": p.amount_paid,
                "created_at": p.created_at,
            }
            for p in recent_sales
        ],
    }
