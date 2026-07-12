from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.models.user import User
from app.services.billing import (
    get_current_user_premium_status,
    handle_paystack_event,
    mark_subscription_cancelled,
    mark_subscription_past_due,
    sync_subscription_access,
)


def _user(**kwargs) -> User:
    defaults = {
        "email": "pro@example.com",
        "password_hash": "hash",
        "is_premium": True,
        "premium_plan": "monthly",
        "premium_period_end": datetime.now(timezone.utc) + timedelta(days=20),
        "paystack_subscription_code": "SUB_123",
        "paystack_email_token": "tok_abc",
        "subscription_status": "active",
    }
    defaults.update(kwargs)
    return User(**defaults)


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


def test_cancelled_subscription_keeps_access_until_period_end():
    user = _user(
        subscription_status="cancelled",
        premium_period_end=datetime.now(timezone.utc) + timedelta(days=5),
    )
    db = MagicMock()
    status = get_current_user_premium_status(user, db)
    assert status["is_premium"] is True
    assert status["is_cancelled_pending_expiry"] is True


def test_cancelled_subscription_downgrades_after_period_end():
    user = _user(
        subscription_status="cancelled",
        premium_period_end=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db = MagicMock()
    status = get_current_user_premium_status(user, db)
    assert status["is_premium"] is False
    assert user.subscription_status == "expired"
    assert user.is_premium is False


def test_invoice_payment_failed_marks_past_due_without_immediate_downgrade():
    user = _user(premium_period_end=datetime.now(timezone.utc) + timedelta(days=10))
    db = MagicMock()
    with patch("app.services.billing._find_user_for_event", return_value=user):
        handle_paystack_event(
            db,
            {
                "event": "invoice.payment_failed",
                "data": {
                    "subscription_code": "SUB_123",
                    "customer": {"email": user.email},
                },
            },
        )

    assert user.subscription_status == "past_due"
    assert user.is_premium is True
    assert user.premium_grace_until is not None
    assert user.premium_grace_until > user.premium_period_end


def test_past_due_downgrades_after_grace_period():
    user = _user(
        subscription_status="past_due",
        premium_period_end=datetime.now(timezone.utc) - timedelta(days=1),
        premium_grace_until=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db = MagicMock()
    sync_subscription_access(db, user)
    assert user.is_premium is False
    assert user.subscription_status == "expired"


def test_subscription_disable_marks_cancelled_not_immediate_downgrade():
    user = _user()
    db = MagicMock()
    with patch("app.services.billing._find_user_for_event", return_value=user):
        handle_paystack_event(
            db,
            {
                "event": "subscription.disable",
                "data": {"subscription_code": "SUB_123", "customer": {"email": user.email}},
            },
        )

    assert user.subscription_status == "cancelled"
    assert user.is_premium is True


def test_cancel_subscription_helper_keeps_premium_flag():
    user = _user()
    db = MagicMock()
    mark_subscription_cancelled(db, user)
    assert user.subscription_status == "cancelled"
    assert user.is_premium is True


def test_mark_past_due_sets_grace_window():
    user = _user(premium_period_end=datetime.now(timezone.utc) + timedelta(days=4))
    db = MagicMock()
    mark_subscription_past_due(db, user)
    assert user.subscription_status == "past_due"
    assert user.premium_grace_until is not None


def test_one_time_charge_sets_manual_renewal():
    user = _user()
    db = MagicMock()
    paid_at = datetime.now(timezone.utc)
    with patch("app.services.billing._find_user_for_event", return_value=user):
        handle_paystack_event(
            db,
            {
                "event": "charge.success",
                "data": {
                    "reference": "ref_manual",
                    "paid_at": paid_at.isoformat(),
                    "metadata": {"plan": "monthly", "auto_renew": False},
                    "customer": {"email": user.email},
                },
            },
        )

    assert user.renewal_type == "manual"
    assert user.is_premium is True
    assert user.paystack_subscription_code is None
    assert user.premium_period_end is not None


def test_subscription_charge_sets_auto_renewal():
    user = _user(paystack_subscription_code=None, paystack_email_token=None)
    db = MagicMock()
    with patch("app.services.billing._find_user_for_event", return_value=user):
        handle_paystack_event(
            db,
            {
                "event": "charge.success",
                "data": {
                    "reference": "ref_auto",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "metadata": {"plan": "yearly", "auto_renew": True},
                    "plan": {"plan_code": "PLN_test"},
                    "subscription": {"subscription_code": "SUB_new", "email_token": "tok_new"},
                    "customer": {"email": user.email},
                },
            },
        )

    assert user.renewal_type == "auto"
    assert user.paystack_subscription_code == "SUB_new"
    assert user.paystack_email_token == "tok_new"


def test_manual_user_downgrades_after_period_end():
    user = _user(
        renewal_type="manual",
        premium_period_end=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db = MagicMock()
    status = get_current_user_premium_status(user, db)
    assert status["is_premium"] is False
    assert user.is_premium is False
