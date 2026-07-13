from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.product import PublicProductResponse
from app.schemas.social_link import SocialLinkItem

LayoutMode = Literal["grouped", "freeform"]


class ThemeSettings(BaseModel):
    backgroundType: Literal["solid", "gradient", "image", "pattern"] = "solid"
    background: str = "#0a0a0f"
    textColor: str = "#ffffff"
    accentColor: str = "#6366f1"
    accentSecondary: str | None = None
    buttonStyle: Literal["rounded", "square", "outline", "filled", "glass"] = "filled"
    fontDisplay: str = "DM Sans"
    fontBody: str = "DM Sans"
    fontFamily: str | None = None
    signatureEffect: str | None = None
    presetId: str | None = None

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

        legacy_font_map = {
            "inter": ("Inter", "Inter"),
            "dm-sans": ("DM Sans", "DM Sans"),
            "playfair": ("Playfair Display", "Playfair Display"),
            "space-grotesk": ("Space Grotesk", "Space Grotesk"),
            "outfit": ("Outfit", "Outfit"),
        }
        legacy_font = normalized.get("fontFamily")
        if not normalized.get("fontDisplay") and legacy_font in legacy_font_map:
            display, body = legacy_font_map[legacy_font]
            normalized["fontDisplay"] = display
            normalized["fontBody"] = body

        if not normalized.get("fontBody"):
            normalized["fontBody"] = normalized.get("fontDisplay") or "DM Sans"
        if not normalized.get("fontDisplay"):
            normalized["fontDisplay"] = normalized.get("fontBody") or "DM Sans"
        if not normalized.get("textColor"):
            normalized["textColor"] = "#ffffff"

        return normalized


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    username: str
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    avatar_public_id: str | None = None
    email_capture_enabled: bool = False
    email_capture_heading: str | None = None
    email_capture_position: int = 0
    announcement_enabled: bool = False
    announcement_text: str | None = None
    layout_mode: LayoutMode = "grouped"
    theme_settings: ThemeSettings
    is_premium: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    full_name: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)
    theme_settings: ThemeSettings | None = None


class AnnouncementUpdate(BaseModel):
    announcement_enabled: bool | None = None
    announcement_text: str | None = Field(default=None, max_length=150)


class PublicProfileResponse(BaseModel):
    profile_id: str
    username: str
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    social_links: list[SocialLinkItem] = Field(default_factory=list)
    products: list[PublicProductResponse] = Field(default_factory=list)
    email_capture_enabled: bool = False
    email_capture_heading: str | None = None
    announcement_text: str | None = None
    layout_mode: LayoutMode = "grouped"
    theme_settings: ThemeSettings
    show_branding_badge: bool = True
