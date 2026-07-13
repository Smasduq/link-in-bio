"""Feature flags — DB-backed toggles with code fallbacks."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.feature_flag import FeatureFlag

logger = logging.getLogger(__name__)

DEFAULT_FLAGS: dict[str, dict[str, Any]] = {
    "pro_button_styles": {
        "value": ["glass", "rounded", "square"],
        "description": "Button styles that require Pro (free: filled, outline)",
    },
    "pro_background_types": {
        "value": ["gradient", "pattern", "image"],
        "description": "Background types that require Pro (free: solid)",
    },
    "pro_preset_ids": {
        "value": [
            "midnight-glass",
            "paper-ink",
            "sunset-pop",
            "terminal",
            "botanical",
            "neon-grid",
        ],
        "description": "Theme preset IDs that require Pro",
    },
    "free_product_limit": {
        "value": 1,
        "description": "Maximum products on the free plan",
    },
    "premium_analytics_days": {
        "value": 7,
        "description": "Days of analytics history for Pro users",
    },
}


def ensure_feature_flags(db: Session) -> None:
    for key, meta in DEFAULT_FLAGS.items():
        existing = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
        if existing:
            continue
        db.add(FeatureFlag(key=key, value=meta["value"], description=meta["description"]))
    db.commit()


def list_feature_flags(db: Session) -> list[FeatureFlag]:
    ensure_feature_flags(db)
    return db.query(FeatureFlag).order_by(FeatureFlag.key).all()


def get_flag_value(db: Session | None, key: str, default: Any = None) -> Any:
    if db is None:
        return DEFAULT_FLAGS.get(key, {}).get("value", default)
    row = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if row is None:
        return DEFAULT_FLAGS.get(key, {}).get("value", default)
    return row.value


def get_pro_button_styles(db: Session | None) -> frozenset[str]:
    value = get_flag_value(db, "pro_button_styles", DEFAULT_FLAGS["pro_button_styles"]["value"])
    return frozenset(str(item) for item in value)


def get_pro_background_types(db: Session | None) -> frozenset[str]:
    value = get_flag_value(db, "pro_background_types", DEFAULT_FLAGS["pro_background_types"]["value"])
    return frozenset(str(item) for item in value)


def get_pro_preset_ids(db: Session | None) -> frozenset[str]:
    value = get_flag_value(db, "pro_preset_ids", DEFAULT_FLAGS["pro_preset_ids"]["value"])
    return frozenset(str(item) for item in value)


def get_free_product_limit(db: Session | None) -> int:
    value = get_flag_value(db, "free_product_limit", DEFAULT_FLAGS["free_product_limit"]["value"])
    return int(value)


def update_feature_flag(db: Session, key: str, value: Any) -> FeatureFlag:
    row = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if not row:
        raise KeyError(key)
    row.value = value
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
