import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.trial_email_claim import TrialEmailClaim
from app.models.user import User
from app.services.trial_billing import (
    assert_can_start_trial,
    email_has_used_trial,
    is_trial_tokenization_charge,
    process_trial_tokenization_charge,
)


def _user(**kwargs) -> User:
    defaults = {
        "email": "trial@example.com",
        "password_hash": "hash",
        "is_premium": False,
        "trial_used": False,
        "is_trial": False,
    }
    defaults.update(kwargs)
    user = User(**defaults)
    user.id = kwargs.get("id", "user-1")
    return user


def test_is_trial_tokenization_charge():
    assert is_trial_tokenization_charge({"metadata": {"purpose": "trial_tokenization"}}) is True
    assert is_trial_tokenization_charge({"metadata": {"purpose": "other"}}) is False


def test_assert_can_start_trial_rejects_used_account():
    db = MagicMock()
    user = _user(trial_used=True)
    with pytest.raises(ValueError, match="already used"):
        assert_can_start_trial(db, user)


def test_email_has_used_trial_checks_claim_table():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = TrialEmailClaim(
        email="trial@example.com",
        user_id="old-user",
    )
    assert email_has_used_trial(db, "trial@example.com") is True


@patch("app.services.trial_billing.create_paystack_subscription", new_callable=AsyncMock)
@patch("app.services.trial_billing.refund_transaction", new_callable=AsyncMock)
@patch("app.services.trial_billing.get_plan_by_slug")
@patch("app.services.trial_billing.notify_user")
@patch("app.services.trial_billing.has_recent_notification", return_value=False)
def test_process_trial_refunds_then_activates(
    _recent,
    _notify,
    mock_get_plan,
    mock_refund,
    mock_create_sub,
):
    plan = MagicMock()
    plan.paystack_plan_code = "PLN_monthly"
    mock_get_plan.return_value = plan
    mock_create_sub.return_value = {
        "subscription_code": "SUB_trial",
        "email_token": "tok_trial",
    }

    db = MagicMock()
    user = _user()
    data = {
        "reference": "ref_trial_1",
        "metadata": {"purpose": "trial_tokenization", "plan": "monthly"},
        "authorization": {"authorization_code": "AUTH_123"},
        "customer": {"customer_code": "CUS_123"},
    }

    handled = asyncio.run(
        process_trial_tokenization_charge(db, user, data, reference="ref_trial_1")
    )

    assert handled is True
    mock_refund.assert_awaited_once()
    mock_create_sub.assert_awaited_once()
    assert user.is_trial is True
    assert user.trial_used is True
    assert user.is_premium is True
    assert user.paystack_subscription_code == "SUB_trial"


@patch("app.services.trial_billing.refund_transaction", new_callable=AsyncMock, side_effect=RuntimeError("refund failed"))
@patch("app.services.trial_billing.get_plan_by_slug")
def test_process_trial_skips_activation_when_refund_fails(mock_get_plan, _mock_refund):
    plan = MagicMock()
    plan.paystack_plan_code = "PLN_monthly"
    mock_get_plan.return_value = plan

    db = MagicMock()
    user = _user()
    data = {
        "reference": "ref_trial_2",
        "metadata": {"purpose": "trial_tokenization", "plan": "monthly"},
        "authorization": {"authorization_code": "AUTH_123"},
        "customer": {"customer_code": "CUS_123"},
    }

    handled = asyncio.run(
        process_trial_tokenization_charge(db, user, data, reference="ref_trial_2")
    )

    assert handled is True
    assert user.is_trial is False
    assert user.trial_used is False


@patch("app.services.trial_billing.create_paystack_subscription", new_callable=AsyncMock)
@patch("app.services.trial_billing.refund_transaction", new_callable=AsyncMock)
@patch("app.services.trial_billing.get_plan_by_slug")
def test_process_trial_idempotent_when_already_active(mock_get_plan, mock_refund, mock_create_sub):
    db = MagicMock()
    user = _user(
        is_trial=True,
        trial_used=True,
        paystack_subscription_code="SUB_existing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=10),
    )
    data = {
        "reference": "ref_trial_3",
        "metadata": {"purpose": "trial_tokenization", "plan": "monthly"},
        "authorization": {"authorization_code": "AUTH_123"},
        "customer": {"customer_code": "CUS_123"},
    }

    handled = asyncio.run(
        process_trial_tokenization_charge(db, user, data, reference="ref_trial_3")
    )

    assert handled is True
    mock_refund.assert_not_awaited()
    mock_create_sub.assert_not_awaited()
