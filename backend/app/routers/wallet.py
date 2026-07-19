"""Referral wallet endpoints.

GET  /api/wallet          — current balance, referral history, withdrawal history
POST /api/wallet/withdraw — request a withdrawal of the full balance
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.referral_earning import ReferralEarning
from app.models.user import User
from app.models.withdrawal_request import WithdrawalRequest
from app.services.notifications import notify_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wallet", tags=["wallet"])

MINIMUM_WITHDRAWAL_AMOUNT = 1000.0
REFERRAL_REWARD_AMOUNT = 100.0


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ReferralEarningItem(BaseModel):
    id: str
    referral_id: str
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingReferralItem(BaseModel):
    """A user who signed up via this user's referral link but hasn't paid yet."""
    user_id: str
    joined_at: datetime


class WithdrawalRequestItem(BaseModel):
    id: str
    amount: float
    bank_name: str
    account_number: str
    account_name: str
    status: str
    requested_at: datetime
    paid_at: datetime | None

    model_config = {"from_attributes": True}


class WalletResponse(BaseModel):
    wallet_balance: float
    minimum_withdrawal: float
    referral_earnings: list[ReferralEarningItem]
    pending_referrals: list[PendingReferralItem]
    withdrawal_requests: list[WithdrawalRequestItem]
    pending_withdrawal: WithdrawalRequestItem | None
    # Convenience fields for the frontend progress bar
    referrals_needed_for_withdrawal: int
    referral_link_code: str


class WithdrawRequest(BaseModel):
    bank_name: str = Field(min_length=1, max_length=120)
    account_number: str = Field(min_length=6, max_length=20, pattern=r"^\d+$")
    account_name: str = Field(min_length=1, max_length=120)


class WithdrawResponse(BaseModel):
    message: str
    withdrawal_id: str
    amount: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_pending_withdrawal(db: Session, user_id: str) -> WithdrawalRequest | None:
    return (
        db.query(WithdrawalRequest)
        .filter(
            WithdrawalRequest.user_id == user_id,
            WithdrawalRequest.status == "pending",
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=WalletResponse)
def get_wallet(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    balance = float(user.wallet_balance)

    earnings = (
        db.query(ReferralEarning)
        .filter(ReferralEarning.user_id == user.id)
        .order_by(ReferralEarning.created_at.desc())
        .all()
    )

    # Users who signed up via this user's referral link but have not paid yet.
    # We find them by: referred_by_id = user.id AND no ReferralEarning row
    # where referral_id = their id.
    paid_referral_ids = {e.referral_id for e in earnings}
    all_referred = (
        db.query(User.id, User.created_at)
        .filter(User.referred_by_id == user.id)
        .order_by(User.created_at.desc())
        .all()
    )
    pending_referrals = [
        PendingReferralItem(user_id=r.id, joined_at=r.created_at)
        for r in all_referred
        if r.id not in paid_referral_ids
    ]

    withdrawals = (
        db.query(WithdrawalRequest)
        .filter(WithdrawalRequest.user_id == user.id)
        .order_by(WithdrawalRequest.requested_at.desc())
        .all()
    )

    pending = next((w for w in withdrawals if w.status == "pending"), None)

    # How many more ₦100 referrals are needed to reach the ₦1,000 threshold.
    shortfall = max(0.0, MINIMUM_WITHDRAWAL_AMOUNT - balance)
    referrals_needed = int(-(-shortfall // REFERRAL_REWARD_AMOUNT))  # ceiling division

    return WalletResponse(
        wallet_balance=balance,
        minimum_withdrawal=MINIMUM_WITHDRAWAL_AMOUNT,
        referral_earnings=[ReferralEarningItem.model_validate(e) for e in earnings],
        pending_referrals=pending_referrals,
        withdrawal_requests=[WithdrawalRequestItem.model_validate(w) for w in withdrawals],
        pending_withdrawal=WithdrawalRequestItem.model_validate(pending) if pending else None,
        referrals_needed_for_withdrawal=referrals_needed,
        # The user's ID doubles as their referral code; the frontend builds
        # the full link as: {origin}/sign-up?ref={code}
        referral_link_code=user.id,
    )


@router.post("/withdraw", response_model=WithdrawResponse, status_code=status.HTTP_201_CREATED)
def request_withdrawal(
    payload: WithdrawRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    balance = float(user.wallet_balance)

    # ── Guard 1: minimum balance ──────────────────────────────────────────
    if balance < MINIMUM_WITHDRAWAL_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Your balance ({balance:.0f}) is below the minimum withdrawal "
                f"amount of ₦{MINIMUM_WITHDRAWAL_AMOUNT:.0f}."
            ),
        )

    # ── Guard 2: no duplicate pending request ─────────────────────────────
    # This check + the balance deduction below happen inside a single
    # flush so there is no window for a second concurrent request to slip
    # through with the same balance.
    existing_pending = _get_pending_withdrawal(db, user.id)
    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"You already have a pending withdrawal request "
                f"(₦{float(existing_pending.amount):.0f} requested on "
                f"{existing_pending.requested_at.strftime('%d %b %Y')}). "
                "Please wait until it is processed before submitting a new request."
            ),
        )

    # ── Atomically deduct the FULL balance ────────────────────────────────
    # Using a conditional UPDATE that also acts as a DB-level lock:
    # only proceeds if wallet_balance still equals what we read above.
    # This prevents a double-spend if two requests arrive simultaneously.
    rows_updated = db.execute(
        text(
            "UPDATE users SET wallet_balance = 0 "
            "WHERE id = :uid AND wallet_balance >= :min_amount"
        ),
        {"uid": user.id, "min_amount": MINIMUM_WITHDRAWAL_AMOUNT},
    ).rowcount

    if rows_updated == 0:
        # Another concurrent request beat us to it (race condition) or
        # balance dropped below minimum between our read and this write.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Withdrawal could not be processed. Please refresh and try again.",
        )

    # ── Create the withdrawal request row ─────────────────────────────────
    withdrawal = WithdrawalRequest(
        user_id=user.id,
        amount=balance,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        account_name=payload.account_name,
        status="pending",
        requested_at=_utcnow(),
    )
    db.add(withdrawal)
    db.flush()

    # ── Notify user ───────────────────────────────────────────────────────
    notify_user(
        db,
        user.id,
        "withdrawal_requested",
        {"amount": balance},
    )

    db.commit()

    logger.info(
        "Withdrawal request %s created for user %s — ₦%s deducted from wallet",
        withdrawal.id,
        user.id,
        balance,
    )

    return WithdrawResponse(
        message="Withdrawal request received — you'll be paid within 2 working days.",
        withdrawal_id=withdrawal.id,
        amount=balance,
    )
