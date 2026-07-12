from datetime import datetime, timedelta, timezone

from app.models.user import User
from app.services.billing import get_current_user_premium_status


def test_premium_status_false_when_flag_off():
    user = User(email="a@b.com", password_hash="x", is_premium=False)
    status = get_current_user_premium_status(user)
    assert status["is_premium"] is False
    assert status["plan"] == "free"


def test_premium_status_false_when_period_expired():
    user = User(
        email="a@b.com",
        password_hash="x",
        is_premium=True,
        premium_plan="monthly",
        premium_period_end=datetime.now(timezone.utc) - timedelta(days=1),
    )
    status = get_current_user_premium_status(user)
    assert status["is_premium"] is False


def test_premium_status_true_when_active():
    user = User(
        email="a@b.com",
        password_hash="x",
        is_premium=True,
        premium_plan="yearly",
        premium_period_end=datetime.now(timezone.utc) + timedelta(days=10),
    )
    status = get_current_user_premium_status(user)
    assert status["is_premium"] is True
    assert status["plan"] == "yearly"
