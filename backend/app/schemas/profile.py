from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ThemeSettings(BaseModel):
    backgroundType: Literal["solid", "gradient", "image"] = "solid"
    background: str = "#0a0a0f"
    buttonStyle: Literal["rounded", "square", "outline", "filled"] = "filled"
    fontFamily: Literal["inter", "dm-sans", "playfair", "space-grotesk", "outfit"] = "dm-sans"
    accentColor: str = "#6366f1"

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        legacy_style = normalized.get("buttonStyle")
        if legacy_style == "sharp":
            normalized["buttonStyle"] = "square"
        elif legacy_style == "rounded-lg":
            normalized["buttonStyle"] = "rounded"

        if "backgroundType" not in normalized:
            bg = str(normalized.get("background", ""))
            if bg.lower().startswith(("http://", "https://")):
                normalized["backgroundType"] = "image"
            elif "gradient(" in bg.lower():
                normalized["backgroundType"] = "gradient"
            else:
                normalized["backgroundType"] = "solid"

        font = normalized.get("fontFamily")
        allowed = {"inter", "dm-sans", "playfair", "space-grotesk", "outfit"}
        if font not in allowed:
            normalized["fontFamily"] = "dm-sans"

        return normalized


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
