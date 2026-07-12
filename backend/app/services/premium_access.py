"""Single source of truth for Pro feature access — mirrors frontend/src/lib/premium-features.ts."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.billing import get_current_user_premium_status

FREE_BACKGROUND_TYPES = frozenset({"solid"})
PRO_BACKGROUND_TYPES = frozenset({"gradient", "pattern", "image"})

FREE_BUTTON_STYLES = frozenset({"filled", "outline"})
PRO_BUTTON_STYLES = frozenset({"glass", "rounded", "square"})

FREE_FONTS = frozenset({"Inter", "DM Sans"})

FREE_PRODUCT_LIMIT = 1

FREE_ANALYTICS_HISTORY_DAYS = 1
PREMIUM_ANALYTICS_HISTORY_DAYS = 7

PREMIUM_PRESET_IDS = frozenset(
    {
        "midnight-glass",
        "paper-ink",
        "sunset-pop",
        "terminal",
        "botanical",
        "neon-grid",
    }
)

DEFAULT_FREE_THEME: dict[str, Any] = {
    "backgroundType": "solid",
    "background": "#0a0a0f",
    "textColor": "#ffffff",
    "accentColor": "#6366f1",
    "accentSecondary": None,
    "buttonStyle": "filled",
    "fontDisplay": "DM Sans",
    "fontBody": "DM Sans",
    "fontFamily": None,
    "signatureEffect": None,
    "presetId": None,
}


def get_premium_status(user: User, db: Session | None = None) -> dict[str, Any]:
    """
    Canonical premium check: syncs expiry/downgrade when db is provided, then evaluates
    is_premium flag AND whether access_until is still in the future.
    """
    return get_current_user_premium_status(user, db)


def user_is_premium(user: User, db: Session | None = None) -> bool:
    return bool(get_premium_status(user, db)["is_premium"])


def require_premium(user: User, db: Session) -> None:
    if not user_is_premium(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required for this feature",
        )


def assert_can_create_product(user: User, db: Session, profile_id: str, *, current_count: int | None = None) -> None:
    if user_is_premium(user, db):
        return

    count = current_count
    if count is None:
        from sqlalchemy import func

        from app.models.product import Product

        count = (
            db.query(func.count(Product.id)).filter(Product.profile_id == profile_id).scalar() or 0
        )

    if count >= FREE_PRODUCT_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free plan allows only 1 product. Upgrade to Pro for unlimited products.",
        )


def _normalize_button_style(raw: str | None) -> str | None:
    if raw == "sharp":
        return "square"
    if raw == "rounded-lg":
        return "rounded"
    return raw


def theme_uses_pro_features(theme: dict[str, Any]) -> bool:
    preset_id = theme.get("presetId")
    if preset_id and preset_id in PREMIUM_PRESET_IDS:
        return True

    if theme.get("backgroundType", "solid") in PRO_BACKGROUND_TYPES:
        return True

    button_style = _normalize_button_style(theme.get("buttonStyle"))
    if button_style and button_style not in FREE_BUTTON_STYLES:
        return True

    if theme.get("signatureEffect"):
        return True

    for key in ("fontDisplay", "fontBody"):
        font = theme.get(key)
        if font and font not in FREE_FONTS:
            return True

    return False


def validate_theme_settings(theme: dict[str, Any], *, is_premium: bool) -> None:
    if is_premium or not theme_uses_pro_features(theme):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Pro plan required for this theme customization",
    )


def sanitize_theme_for_public(theme: dict[str, Any], *, is_premium: bool) -> dict[str, Any]:
    if is_premium:
        return theme
    if not theme_uses_pro_features(theme):
        return theme
    return dict(DEFAULT_FREE_THEME)


def empty_visitor_insights() -> dict[str, list]:
    return {
        "top_regions": [],
        "top_devices": [],
        "most_active_time": [],
    }
