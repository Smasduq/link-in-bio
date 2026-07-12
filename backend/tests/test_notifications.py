from unittest.mock import MagicMock, patch

from app.models.user import User
from app.services.notifications import notify_user


def test_notify_user_inserts_notification_and_attempts_email():
    db = MagicMock()
    user = User(email="test@example.com", password_hash="hash")
    user.id = "user-1"
    db.query.return_value.filter.return_value.first.return_value = user

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
    db = MagicMock()
    user = User(email="test@example.com", password_hash="hash")
    user.id = "user-1"
    db.query.return_value.filter.return_value.first.return_value = user

    with patch("app.services.notifications.send_transactional_email", side_effect=RuntimeError("smtp down")):
        notification = notify_user(db, user.id, "subscription_cancelled", {"current_period_end": "2026-08-12"})

    assert notification is not None
    db.flush.assert_called_once()
