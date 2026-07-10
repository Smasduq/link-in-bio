from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ThemeSettings(BaseModel):
    background: str = "#0a0a0f"
    buttonStyle: Literal["rounded", "sharp", "outline", "rounded-lg"] = "rounded-lg"
    fontFamily: str = "dm-sans"
    accentColor: str = "#6366f1"


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    username: str
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    theme_settings: ThemeSettings
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    full_name: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)
    theme_settings: ThemeSettings | None = None


class PublicProfileResponse(BaseModel):
    username: str
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    theme_settings: ThemeSettings
