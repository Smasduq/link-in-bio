from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")


class LoginRequest(BaseModel):
    """Accepts email or username in `identifier` (`email` kept for legacy clients)."""
    identifier: str | None = Field(default=None, min_length=1)
    email: str | None = Field(default=None, min_length=1)
    password: str

    @model_validator(mode="after")
    def require_login_identifier(self) -> "LoginRequest":
        if not self.login_identifier:
            raise ValueError("Email or username is required")
        return self

    @property
    def login_identifier(self) -> str:
        return (self.identifier or self.email or "").strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class LoginRequestResponse(BaseModel):
    requires_otp: bool = True
    challenge_id: str | None = None
    message: str | None = None
    email: str | None = None
    access_token: str | None = None
    token_type: str = "bearer"
    user: UserResponse | None = None


class OtpChallengeResponse(BaseModel):
    challenge_id: str
    message: str
    email: str


class VerifyOtpRequest(BaseModel):
    challenge_id: str
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendOtpRequest(BaseModel):
    challenge_id: str
