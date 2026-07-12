from pydantic import BaseModel, Field


class PushSubscribeRequest(BaseModel):
    endpoint: str = Field(min_length=1)
    keys: dict[str, str]

    @property
    def p256dh(self) -> str:
        return self.keys.get("p256dh", "")

    @property
    def auth(self) -> str:
        return self.keys.get("auth", "")


class PushSubscribeResponse(BaseModel):
    subscribed: bool


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class NotificationPreferencesResponse(BaseModel):
    email_billing_enabled: bool
    email_engagement_enabled: bool
    push_billing_enabled: bool
    push_engagement_enabled: bool
    has_push_subscription: bool


class NotificationPreferencesUpdate(BaseModel):
    email_billing_enabled: bool | None = None
    email_engagement_enabled: bool | None = None
    push_billing_enabled: bool | None = None
    push_engagement_enabled: bool | None = None


class UserTimezoneUpdate(BaseModel):
    timezone: str = Field(min_length=1, max_length=64)
