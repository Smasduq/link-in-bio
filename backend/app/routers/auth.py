from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.otp_challenge import OtpChallenge
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LoginRequestResponse,
    MessageResponse,
    OtpChallengeResponse,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.services.auth import authenticate_user, create_access_token
from app.services.otp import (
    complete_login,
    complete_signup,
    create_login_challenge,
    create_signup_challenge,
    dispatch_otp_email,
    resend_challenge_otp,
    verify_challenge,
)
from app.services.user_email import (
    create_password_reset_token,
    reset_password_with_token,
    send_password_reset,
    send_welcome,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked = local[0] + "***"
    else:
        masked = local[0] + "***" + local[-1]
    return f"{masked}@{domain}"


def _otp_response(*, challenge_id: str, email: str) -> OtpChallengeResponse:
    return OtpChallengeResponse(
        challenge_id=challenge_id,
        message="Verification code sent to your email",
        email=_mask_email(email),
    )


def _send_otp_or_fail(
    db: Session,
    *,
    challenge_id: str,
    to: str,
    otp: str,
    purpose: str,
) -> OtpChallengeResponse:
    sent, error = dispatch_otp_email(to=to, otp=otp, purpose=purpose)
    if sent:
        return _otp_response(challenge_id=challenge_id, email=to)

    db.query(OtpChallenge).filter(OtpChallenge.id == challenge_id).delete()
    db.commit()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=error or "Could not send verification email. Please try again.",
    )


@router.post("/register/request", response_model=OtpChallengeResponse)
def register_request(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    username = payload.username.lower().strip()

    email = payload.email.strip().lower()

    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

    if db.query(Profile).filter(Profile.username == username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    challenge_id, otp = create_signup_challenge(
        db, email=email, username=username, password=payload.password
    )
    return _send_otp_or_fail(db, challenge_id=challenge_id, to=email, otp=otp, purpose="signup")


@router.post("/register/verify", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_verify(
    payload: VerifyOtpRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    challenge = verify_challenge(db, challenge_id=payload.challenge_id, otp=payload.otp)

    try:
        user = complete_signup(db, challenge)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    username = profile.username if profile else user.name or "user"
    background_tasks.add_task(send_welcome, user.email, username)

    return _auth_response(user)


def _auth_response(user: User) -> AuthResponse:
    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name),
    )


@router.post("/login/request", response_model=LoginRequestResponse)
def login_request(
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.is_email_verified:
        auth = _auth_response(user)
        return LoginRequestResponse(
            requires_otp=False,
            access_token=auth.access_token,
            token_type=auth.token_type,
            user=auth.user,
            message="Signed in successfully",
        )

    challenge_id, otp = create_login_challenge(db, user=user)
    otp_response = _send_otp_or_fail(db, challenge_id=challenge_id, to=user.email, otp=otp, purpose="login")
    return LoginRequestResponse(
        requires_otp=True,
        challenge_id=otp_response.challenge_id,
        message=otp_response.message,
        email=otp_response.email,
    )


@router.post("/login/verify", response_model=AuthResponse)
def login_verify(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    challenge = verify_challenge(db, challenge_id=payload.challenge_id, otp=payload.otp)
    user = complete_login(db, challenge)
    return _auth_response(user)


@router.post("/otp/resend", response_model=OtpChallengeResponse)
def resend_otp(
    payload: ResendOtpRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result = resend_challenge_otp(db, payload.challenge_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session expired. Start again.")

    challenge_id, otp = result
    challenge = db.query(OtpChallenge).filter(OtpChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session expired. Start again.")

    sent, error = dispatch_otp_email(to=challenge.email, otp=otp, purpose=challenge.purpose)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error or "Could not send verification email. Please try again.",
        )
    return _otp_response(challenge_id=challenge_id, email=challenge.email)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, email=current_user.email, name=current_user.name)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        raw_token = create_password_reset_token(db, user)
        if raw_token:
            background_tasks.add_task(send_password_reset, user.email, raw_token)

    return MessageResponse(message="If that email exists, a reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not reset_password_with_token(db, payload.token, payload.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    return MessageResponse(message="Password updated. You can sign in now.")
