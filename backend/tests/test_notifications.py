from unittest.mock import MagicMock, patch

from app.models.notification_preferences import NotificationPreferences
from app.models.user import User
from app.services.notifications import notify_user


def _mock_db_with_user(user: User) -> MagicMock:
    prefs = NotificationPreferences(
        user_id=user.id,
        email_billing_enabled=True,
        email_engagement_enabled=True,
        push_billing_enabled=True,
        push_engagement_enabled=True,
    )
    db = MagicMock()

    def query_side_effect(model):
        chain = MagicMock()
        if model is User:
            chain.filter.return_value.first.return_value = user
        else:
            chain.filter.return_value.first.return_value = prefs
        return chain

    db.query.side_effect = query_side_effect
    return db


def test_notify_user_inserts_notification_and_attempts_email():
    user = User(email="test@example.com", password_hash="hash")
    user.id = "user-1"
    db = _mock_db_with_user(user)

    with patch("app.services.notifications.send_transactional_email") as send_email:
        notification = notify_user(
            db,
            user.id,
            "payment_success",
            {"plan": "monthly", "amount": 508.19},
        )

    assert notification is not None
    assert notification.type == "payment_success"
    assert "Pro" in notification.message
    db.add.assert_called()
    db.flush.assert_called_once()
    send_email.assert_called_once()


def test_notify_user_continues_when_email_fails():
    user = User(email="test@example.com", password_hash="hash")
    user.id = "user-1"
    db = _mock_db_with_user(user)

    with patch("app.services.notifications.send_transactional_email", side_effect=RuntimeError("smtp down")):
        notification = notify_user(db, user.id, "subscription_cancelled", {"current_period_end": "2026-08-12"})

    assert notification is not None
    db.flush.assert_called_once()
