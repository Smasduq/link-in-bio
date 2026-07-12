"""Avatar upload and Cloudinary delivery URL helpers."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Final

import cloudinary
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError
from fastapi import HTTPException, UploadFile, status

from app.config import settings
from app.models.profile import Profile

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES: Final[frozenset[str]] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)
MAX_UPLOAD_BYTES: Final[int] = 5 * 1024 * 1024
AVATAR_TRANSFORMS: Final[str] = "w_512,h_512,c_fill,g_face,q_auto,f_auto"


@dataclass(frozen=True)
class AvatarUploadResult:
    public_id: str
    delivery_url: str
    version: int | None


def avatar_public_id_for_user(user_id: str) -> str:
    return f"avatars/{user_id}"


def build_avatar_delivery_url(public_id: str, *, version: int | str | None = None) -> str:
    """
    Build the Cloudinary delivery URL with face-aware crop and auto format/quality.

    Example:
    https://res.cloudinary.com/{cloud}/image/upload/w_512,h_512,c_fill,g_face,q_auto,f_auto/v123/avatars/{user_id}
    """
    cloud_name = settings.cloudinary_cloud_name.strip()
    base = (
        f"https://res.cloudinary.com/{cloud_name}/image/upload/"
        f"{AVATAR_TRANSFORMS}"
    )
    if version is not None:
        return f"{base}/v{version}/{public_id}"
    return f"{base}/{public_id}"


def resolve_profile_avatar_url(profile: Profile) -> str:
    """Return the Cloudinary delivery URL, a legacy URL, or the default placeholder."""
    if profile.avatar_public_id:
        return build_avatar_delivery_url(profile.avatar_public_id, version=profile.avatar_version)
    if profile.avatar_url and profile.avatar_url.strip():
        return profile.avatar_url.strip()
    return settings.default_avatar_url


def _ensure_cloudinary_configured() -> None:
    if not (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Avatar storage is not configured. "
                "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
            ),
        )


def _configure_cloudinary() -> None:
    _ensure_cloudinary_configured()
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def _validate_content_type(content_type: str | None) -> None:
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Upload a JPEG, PNG, or WebP image.",
        )


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is too large. Maximum size is 5MB.",
        )
    return data


def _upload_to_cloudinary(user_id: str, raw_bytes: bytes) -> AvatarUploadResult:
    _configure_cloudinary()
    public_id = avatar_public_id_for_user(user_id)

    try:
        result = cloudinary.uploader.upload(
            raw_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )
    except CloudinaryError as exc:
        logger.exception("Cloudinary upload failed for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Avatar upload failed: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected avatar upload failure for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Avatar upload failed. Please try again shortly.",
        ) from exc

    version = result.get("version")
    version_int = int(version) if version is not None else None
    delivery_url = build_avatar_delivery_url(public_id, version=version_int)
    return AvatarUploadResult(public_id=public_id, delivery_url=delivery_url, version=version_int)


async def upload_avatar(user_id: str, file: UploadFile) -> AvatarUploadResult:
    """
    Validate and upload an avatar image to Cloudinary.
    Returns the stable public_id plus a transformed delivery URL.
    """
    _validate_content_type(file.content_type)
    raw_bytes = await _read_upload(file)
    return _upload_to_cloudinary(user_id, raw_bytes)
