"""Avatar upload, processing, and URL helpers."""

from __future__ import annotations

import io
import logging
from typing import Final

from fastapi import HTTPException, UploadFile, status
from huggingface_hub import HfApi
from huggingface_hub.utils import HfHubHTTPError
from PIL import Image, UnidentifiedImageError

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES: Final[frozenset[str]] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)
MAX_UPLOAD_BYTES: Final[int] = 5 * 1024 * 1024
MAX_DIMENSION: Final[int] = 512
WEBP_QUALITY: Final[int] = 85


def resolve_avatar_url(avatar_url: str | None) -> str:
    """Return the stored avatar URL or the default placeholder."""
    if avatar_url and avatar_url.strip():
        return avatar_url.strip()
    return settings.default_avatar_url


def public_avatar_url(user_id: str) -> str:
    repo_id = settings.hf_repo_id.strip()
    return f"https://huggingface.co/datasets/{repo_id}/resolve/main/avatars/{user_id}.webp"


def _ensure_hf_configured() -> None:
    if not settings.hf_token or not settings.hf_repo_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Avatar storage is not configured. Set HF_TOKEN and HF_REPO_ID.",
        )


def _validate_content_type(content_type: str | None) -> str:
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Upload a JPEG, PNG, or WebP image.",
        )
    return normalized


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


def _process_image(data: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")

            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            save_kwargs: dict[str, object] = {"format": "WEBP", "quality": WEBP_QUALITY, "method": 6}
            if image.mode == "RGBA":
                save_kwargs["lossless"] = False
            image.save(output, **save_kwargs)
            return output.getvalue()
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read image file. Upload a valid JPEG, PNG, or WebP image.",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not process image file.",
        ) from exc


def _upload_to_hf(user_id: str, webp_bytes: bytes) -> str:
    _ensure_hf_configured()
    repo_id = settings.hf_repo_id.strip()
    path_in_repo = f"avatars/{user_id}.webp"

    try:
        HfApi(token=settings.hf_token).upload_file(
            path_or_fileobj=webp_bytes,
            path_in_repo=path_in_repo,
            repo_id=repo_id,
            repo_type="dataset",
            token=settings.hf_token,
        )
    except HfHubHTTPError as exc:
        logger.exception("Hugging Face upload failed for user %s", user_id)
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

    return public_avatar_url(user_id)


async def upload_avatar(user_id: str, file: UploadFile) -> str:
    """
    Validate, resize, and upload an avatar image to Hugging Face Hub.
    Returns the public CDN URL for the stored WebP file.
    """
    _validate_content_type(file.content_type)
    raw_bytes = await _read_upload(file)
    webp_bytes = _process_image(raw_bytes)
    return _upload_to_hf(user_id, webp_bytes)
