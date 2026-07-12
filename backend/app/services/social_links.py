"""Validation and normalization for profile social icon links."""

from __future__ import annotations

import re
from urllib.parse import quote, urlparse

from fastapi import HTTPException, status

from app.schemas.social_link import MAX_SOCIAL_LINKS, SUPPORTED_PLATFORMS, SocialLinkItem

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE_RE = re.compile(r"^\+?[0-9]{7,15}$")
_HANDLE_RE = re.compile(r"^[a-zA-Z0-9._-]{1,100}$")


def _looks_like_url(value: str) -> bool:
    lower = value.lower()
    return "://" in value or lower.startswith("www.") or any(
        host in lower for host in ("instagram.com", "tiktok.com", "twitter.com", "x.com", "youtube.com", "facebook.com", "linkedin.com", "t.me", "wa.me")
    )


def _extract_handle(platform: str, value: str) -> str:
    cleaned = value.strip().lstrip("@").strip("/")
    if not _looks_like_url(value):
        return cleaned

    parsed = urlparse(value if "://" in value else f"https://{value}")
    segments = [segment for segment in parsed.path.split("/") if segment]
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a username, not a full link.",
        )

    if platform == "linkedin":
        if segments[0] == "in" and len(segments) > 1:
            return segments[1]
        return segments[-1]

    if platform == "youtube":
        handle = segments[0]
        return handle.lstrip("@")

    if platform == "telegram":
        return segments[-1].lstrip("@")

    if platform == "whatsapp":
        digits = re.sub(r"\D", "", parsed.path or value)
        if digits:
            return digits
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid WhatsApp number.")

    return segments[-1].lstrip("@")


def _validate_handle(platform: str, handle: str) -> str:
    if not handle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required.",
        )

    if platform in {"instagram", "tiktok", "twitter", "facebook", "telegram"} and not _HANDLE_RE.match(handle):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers, dots, underscores, and hyphens.",
        )

    if platform == "linkedin" and not re.match(r"^[a-zA-Z0-9-]{1,100}$", handle):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid LinkedIn username.")

    if platform == "youtube" and not re.match(r"^[a-zA-Z0-9._-]{1,100}$", handle):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid YouTube handle.")

    return handle


def _build_profile_url(platform: str, handle: str) -> str:
    if platform == "instagram":
        return f"https://instagram.com/{quote(handle, safe='._-')}"
    if platform == "tiktok":
        return f"https://tiktok.com/@{quote(handle.lstrip('@'), safe='._-')}"
    if platform == "twitter":
        return f"https://x.com/{quote(handle, safe='._-')}"
    if platform == "youtube":
        return f"https://youtube.com/@{quote(handle.lstrip('@'), safe='._-')}"
    if platform == "facebook":
        return f"https://facebook.com/{quote(handle, safe='._-')}"
    if platform == "linkedin":
        return f"https://linkedin.com/in/{quote(handle, safe='-')}"
    if platform == "telegram":
        return f"https://t.me/{quote(handle.lstrip('@'), safe='._-')}"
    if platform == "whatsapp":
        return f"https://wa.me/{handle.lstrip('+')}"
    if platform == "email":
        return f"mailto:{handle}"
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported platform.")


def normalize_social_url(platform: str, raw_value: str) -> str:
    value = raw_value.strip()
    if not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required.")

    if platform == "email":
        address = value[7:].strip() if value.lower().startswith("mailto:") else value
        if not _EMAIL_RE.match(address):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")
        return f"mailto:{address}"

    if platform == "whatsapp":
        if _looks_like_url(value):
            digits = re.sub(r"\D", "", urlparse(value if "://" in value else f"https://{value}").path or value)
        else:
            digits = re.sub(r"\D", "", value)
        if not digits or len(digits) < 7 or len(digits) > 15:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid WhatsApp number.")
        return f"https://wa.me/{digits.lstrip('+')}"

    handle = _extract_handle(platform, value)
    handle = _validate_handle(platform, handle)
    return _build_profile_url(platform, handle)


def validate_social_links(links: list[SocialLinkItem]) -> list[dict]:
    if len(links) > MAX_SOCIAL_LINKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can add up to {MAX_SOCIAL_LINKS} social icons.",
        )

    platforms = [link.platform for link in links]
    if len(platforms) != len(set(platforms)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Each platform can only be added once.",
        )

    for link in links:
        if link.platform not in SUPPORTED_PLATFORMS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported platform.")

    ordered = sorted(links, key=lambda item: item.position)
    normalized: list[dict] = []
    for index, link in enumerate(ordered):
        normalized.append(
            {
                "platform": link.platform,
                "url": normalize_social_url(link.platform, link.url),
                "position": index,
            }
        )
    return normalized
