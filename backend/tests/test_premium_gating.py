from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.user import User
from app.services.premium_access import (
    sanitize_theme_for_public,
    theme_uses_pro_features,
    validate_theme_settings,
)


def _free_user() -> User:
    return User(
        email="free@example.com",
        password_hash="hash",
        is_premium=False,
    )


def _pro_user() -> User:
    return User(
        email="pro@example.com",
        password_hash="hash",
        is_premium=True,
        premium_plan="monthly",
        premium_period_end=datetime.now(timezone.utc) + timedelta(days=10),
    )


def test_theme_uses_pro_features_detects_glass():
    assert theme_uses_pro_features({"buttonStyle": "glass", "backgroundType": "solid"})


def test_validate_theme_settings_blocks_glass_for_free():
    with pytest.raises(HTTPException) as exc:
        validate_theme_settings({"buttonStyle": "glass", "backgroundType": "solid"}, is_premium=False)
    assert exc.value.status_code == 403


def test_validate_theme_settings_allows_filled_for_free():
    validate_theme_settings(
        {"buttonStyle": "filled", "backgroundType": "solid", "fontDisplay": "Inter", "fontBody": "DM Sans"},
        is_premium=False,
    )


def test_sanitize_theme_for_public_strips_pro_theme():
    sanitized = sanitize_theme_for_public(
        {"buttonStyle": "glass", "backgroundType": "gradient", "presetId": "midnight-glass"},
        is_premium=False,
    )
    assert sanitized["buttonStyle"] == "filled"
    assert sanitized["backgroundType"] == "solid"
    assert sanitized["presetId"] is None


def test_sanitize_theme_keeps_pro_theme_for_premium_user():
    theme = {"buttonStyle": "glass", "backgroundType": "gradient", "presetId": "midnight-glass"}
    assert sanitize_theme_for_public(theme, is_premium=True) == theme
