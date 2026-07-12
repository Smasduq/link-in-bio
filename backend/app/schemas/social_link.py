from typing import Literal

from pydantic import BaseModel, Field

SocialPlatform = Literal[
    "instagram",
    "tiktok",
    "twitter",
    "youtube",
    "facebook",
    "linkedin",
    "whatsapp",
    "telegram",
    "email",
]

SUPPORTED_PLATFORMS: frozenset[str] = frozenset(
    [
        "instagram",
        "tiktok",
        "twitter",
        "youtube",
        "facebook",
        "linkedin",
        "whatsapp",
        "telegram",
        "email",
    ]
)

MAX_SOCIAL_LINKS = 6


class SocialLinkItem(BaseModel):
    platform: SocialPlatform
    url: str = Field(min_length=1, max_length=500)
    position: int = Field(ge=0, lt=MAX_SOCIAL_LINKS)


class SocialLinksUpdate(BaseModel):
    links: list[SocialLinkItem] = Field(default_factory=list, max_length=MAX_SOCIAL_LINKS)
