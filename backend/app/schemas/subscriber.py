from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SubscribeRequest(BaseModel):
    email: EmailStr


class SubscribeResponse(BaseModel):
    message: str = "Thanks for subscribing!"


class EmailCaptureUpdate(BaseModel):
    email_capture_enabled: bool | None = None
    email_capture_heading: str | None = Field(default=None, max_length=120)


class SubscriberResponse(BaseModel):
    id: str
    email: str
    subscribed_at: datetime

    model_config = {"from_attributes": True}
