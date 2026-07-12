from unittest.mock import MagicMock, patch

import pytest
from pywebpush import WebPushException

from app.models.push_subscription import PushSubscription
from app.services.web_push import send_push_notification


def _subscription() -> PushSubscription:
    sub = PushSubscription(
        user_id="user-1",
        endpoint="https://push.example/abc",
        p256dh_key="key",
        auth_key="auth",
    )
    sub.id = "sub-1"
    return sub


@patch("app.services.web_push.settings")
@patch("app.services.web_push.webpush")
def test_send_push_notification_success(mock_webpush, mock_settings):
    mock_settings.vapid_public_key = "pub"
    mock_settings.vapid_private_key = "priv"
    mock_settings.resolved_push_icon_url = "https://example.com/icon.png"
    mock_settings.mail_from = "hello@example.com"

    ok = send_push_notification(_subscription(), title="Hi", body="Body", url="/dashboard")
    assert ok is True
    mock_webpush.assert_called_once()


@patch("app.services.web_push.settings")
@patch("app.services.web_push.webpush")
def test_send_push_notification_deletes_on_410(mock_webpush, mock_settings):
    mock_settings.vapid_public_key = "pub"
    mock_settings.vapid_private_key = "priv"
    mock_settings.resolved_push_icon_url = "https://example.com/icon.png"
    mock_settings.mail_from = "hello@example.com"

    response = MagicMock(status_code=410)
    mock_webpush.side_effect = WebPushException("gone", response=response)

    db = MagicMock()
    sub = _subscription()

    ok = send_push_notification(sub, title="Hi", body="Body", url="/dashboard", db=db)
    assert ok is False
    db.delete.assert_called_once_with(sub)
    db.flush.assert_called_once()


@patch("app.services.web_push.settings")
@patch("app.services.web_push.webpush")
def test_send_push_notification_keeps_subscription_on_other_errors(mock_webpush, mock_settings):
    mock_settings.vapid_public_key = "pub"
    mock_settings.vapid_private_key = "priv"
    mock_settings.resolved_push_icon_url = "https://example.com/icon.png"
    mock_settings.mail_from = "hello@example.com"

    response = MagicMock(status_code=503)
    mock_webpush.side_effect = WebPushException("unavailable", response=response)

    db = MagicMock()
    ok = send_push_notification(_subscription(), title="Hi", body="Body", url="/dashboard", db=db)
    assert ok is False
    db.delete.assert_not_called()
