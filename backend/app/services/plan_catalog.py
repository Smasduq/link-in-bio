"""Sync local billing plans and Paystack /plan records."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models.billing_plan import BillingPlanRecord
from app.services.fee_pricing import calculate_fee_inclusive_amount, total_charge_kobo
from app.services.paystack import create_paystack_plan, get_paystack_plan_amount_kobo

logger = logging.getLogger(__name__)

PLAN_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "slug": "monthly",
        "name": "Smasduq LinkBio Pro Monthly",
        "interval": "monthly",
        "base_amount": lambda: settings.paystack_monthly_base_amount_ngn,
        "paystack_interval": "monthly",
    },
    {
        "slug": "yearly",
        "name": "Smasduq LinkBio Pro Yearly",
        "interval": "yearly",
        "base_amount": lambda: settings.paystack_yearly_base_amount_ngn,
        "paystack_interval": "annually",
    },
)


def _yearly_savings_fields(base_amount: float) -> dict[str, float]:
    full_year_at_monthly = settings.paystack_monthly_base_amount_ngn * 12
    return {
        "yearly_savings_percent": settings.paystack_yearly_discount_percent,
        "yearly_savings_amount": round(full_year_at_monthly - base_amount, 2),
    }


def _pricing_row(slug: str, name: str, interval: str, base_amount: float) -> dict[str, Any]:
    pricing = calculate_fee_inclusive_amount(base_amount)
    row: dict[str, Any] = {
        "slug": slug,
        "name": name,
        "interval": interval,
        "base_amount": pricing["base_amount"],
        "service_fee": pricing["service_fee"],
        "vat_on_fee": pricing["vat_on_fee"],
        "total_charge": pricing["total_charge"],
        "total_charge_kobo": total_charge_kobo(base_amount),
    }
    if slug == "yearly":
        row.update(_yearly_savings_fields(base_amount))
    return row


def upsert_local_plans(db: Session) -> list[BillingPlanRecord]:
    records: list[BillingPlanRecord] = []

    for definition in PLAN_DEFINITIONS:
        row = _pricing_row(
            definition["slug"],
            definition["name"],
            definition["interval"],
            float(definition["base_amount"]()),
        )
        record = db.query(BillingPlanRecord).filter(BillingPlanRecord.slug == row["slug"]).first()
        if record is None:
            record = BillingPlanRecord(**row)
            db.add(record)
        else:
            for key, value in row.items():
                setattr(record, key, value)
        records.append(record)

    db.flush()
    return records


async def ensure_billing_plans(db: Session) -> None:
    """Upsert local plan rows and create Paystack plans when configured."""
    previous_kobo: dict[str, tuple[str | None, int]] = {}
    for definition in PLAN_DEFINITIONS:
        existing = db.query(BillingPlanRecord).filter(BillingPlanRecord.slug == definition["slug"]).first()
        if existing is not None:
            previous_kobo[existing.slug] = (existing.paystack_plan_code, existing.total_charge_kobo)

    records = upsert_local_plans(db)

    if not settings.paystack_configured:
        db.commit()
        return

    for record, definition in zip(records, PLAN_DEFINITIONS, strict=True):
        prior = previous_kobo.get(record.slug)
        if prior and prior[0] and prior[1] != record.total_charge_kobo:
            logger.info(
                "Paystack plan amount changed for slug=%s (%s → %s kobo); creating new plan",
                record.slug,
                prior[1],
                record.total_charge_kobo,
            )
            record.paystack_plan_code = None

        if record.paystack_plan_code:
            remote_kobo = await get_paystack_plan_amount_kobo(record.paystack_plan_code)
            if remote_kobo is None:
                logger.warning("Could not verify Paystack plan %s for slug=%s", record.paystack_plan_code, record.slug)
                continue
            if remote_kobo != record.total_charge_kobo:
                logger.info(
                    "Paystack plan %s amount mismatch for slug=%s (%s vs %s kobo); creating new plan",
                    record.paystack_plan_code,
                    record.slug,
                    remote_kobo,
                    record.total_charge_kobo,
                )
                record.paystack_plan_code = None
            else:
                continue

        try:
            plan_code = await create_paystack_plan(
                name=record.name,
                interval=definition["paystack_interval"],
                amount_kobo=record.total_charge_kobo,
            )
            record.paystack_plan_code = plan_code
            logger.info("Created Paystack plan %s for slug=%s amount_kobo=%s", plan_code, record.slug, record.total_charge_kobo)
        except Exception:
            logger.exception("Failed to create Paystack plan for slug=%s", record.slug)

    db.commit()


def get_plan_by_slug(db: Session, slug: str) -> BillingPlanRecord | None:
    return (
        db.query(BillingPlanRecord)
        .filter(BillingPlanRecord.slug == slug, BillingPlanRecord.is_active.is_(True))
        .first()
    )


def plan_pricing_payload(db: Session) -> list[dict[str, Any]]:
    records = (
        db.query(BillingPlanRecord)
        .filter(BillingPlanRecord.is_active.is_(True))
        .order_by(BillingPlanRecord.slug)
        .all()
    )
    if records:
        payload: list[dict[str, Any]] = []
        for record in records:
            item: dict[str, Any] = {
                "slug": record.slug,
                "name": record.name,
                "interval": record.interval,
                "base_amount": record.base_amount,
                "service_fee": record.service_fee,
                "vat_on_fee": record.vat_on_fee,
                "total_charge": record.total_charge,
                "total_charge_kobo": record.total_charge_kobo,
                "paystack_plan_code": record.paystack_plan_code,
            }
            if record.slug == "yearly":
                item.update(_yearly_savings_fields(record.base_amount))
            payload.append(item)
        return payload

    return [
        {
            **_pricing_row(
                definition["slug"],
                definition["name"],
                definition["interval"],
                float(definition["base_amount"]()),
            ),
            "paystack_plan_code": None,
        }
        for definition in PLAN_DEFINITIONS
    ]
