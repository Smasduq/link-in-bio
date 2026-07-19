import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.otp_challenge import OtpChallenge
from app.models.profile import Profile
from app.models.user import User
from app.services.auth import hash_password
from app.services.email import send_otp_email

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _normalize_expires(expires_at: datetime) -> datetime:
    if expires_at.tzinfo is None:
        return expires_at.replace(tzinfo=timezone.utc)
    return expires_at


def create_signup_challenge(db: Session, *, email: str, username: str, password: str, referrer_id: str | None = None) -> tuple[str, str]:
    username = username.lower().strip()
    otp = _generate_otp()

    db.query(OtpChallenge).filter(
        OtpChallenge.email == email,
        OtpChallenge.purpose == "signup",
    ).delete()

    challenge = OtpChallenge(
        email=email,
        purpose="signup",
        otp_hash=_hash_otp(otp),
        signup_username=username,
        signup_password_hash=hash_password(password),
        signup_referrer_id=referrer_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge.id, otp


def create_login_challenge(db: Session, *, user: User) -> tuple[str, str]:
    otp = _generate_otp()

    db.query(OtpChallenge).filter(
        OtpChallenge.email == user.email,
        OtpChallenge.purpose == "login",
    ).delete()

    challenge = OtpChallenge(
        email=user.email,
        purpose="login",
        otp_hash=_hash_otp(otp),
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge.id, otp


def resend_challenge_otp(db: Session, challenge_id: str) -> tuple[str, str] | None:
    challenge = db.query(OtpChallenge).filter(OtpChallenge.id == challenge_id).first()
    if not challenge:
        return None

    expires_at = _normalize_expires(challenge.expires_at)
    if expires_at < datetime.now(timezone.utc):
        db.delete(challenge)
        db.commit()
        return None

    otp = _generate_otp()
    challenge.otp_hash = _hash_otp(otp)
    challenge.attempts = 0
    challenge.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)
    db.commit()
    return challenge.id, otp


def verify_challenge(db: Session, *, challenge_id: str, otp: str) -> OtpChallenge:
    challenge = db.query(OtpChallenge).filter(OtpChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    expires_at = _normalize_expires(challenge.expires_at)
    if expires_at < datetime.now(timezone.utc):
        db.delete(challenge)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code expired. Request a new one.")

    if challenge.attempts >= MAX_ATTEMPTS:
        db.delete(challenge)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many attempts. Request a new code.")

    if _hash_otp(otp) != challenge.otp_hash:
        challenge.attempts += 1
        db.commit()
        remaining = MAX_ATTEMPTS - challenge.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid code. {remaining} attempt(s) left.",
        )

    return challenge


def complete_signup(db: Session, challenge: OtpChallenge) -> User:
    if challenge.purpose != "signup" or not challenge.signup_username or not challenge.signup_password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session")

    user = User(
        email=challenge.email,
        password_hash=challenge.signup_password_hash,
        name=challenge.signup_username,
        email_verified_at=datetime.now(timezone.utc),
        referred_by_id=challenge.signup_referrer_id,
    )
    profile = Profile(user=user, username=challenge.signup_username, full_name=challenge.signup_username)
    db.add(user)
    db.add(profile)
    db.delete(challenge)
    db.commit()
    db.refresh(user)
    return user


def complete_login(db: Session, challenge: OtpChallenge) -> User:
    if challenge.purpose != "login" or not challenge.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid login session")

    user = db.query(User).filter(User.id == challenge.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been deleted")
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended - contact support",
        )

    if not user.email_verified_at:
        user.email_verified_at = datetime.now(timezone.utc)

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.delete(challenge)
    db.commit()
    db.refresh(user)
    return user


def dispatch_otp_email(*, to: str, otp: str, purpose: str) -> tuple[bool, str | None]:
    sent, error = send_otp_email(to=to, otp=otp, purpose=purpose)
    if not sent:
        logger.warning("Failed to send OTP email to %s (%s): %s", to, purpose, error)
    return sent, error
