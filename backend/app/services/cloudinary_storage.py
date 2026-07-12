"""Shared Cloudinary upload helpers for images and private product files."""

from __future__ import annotations

import logging
import time
from typing import Final

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from cloudinary.exceptions import Error as CloudinaryError
from fastapi import HTTPException, UploadFile, status

from app.config import settings

logger = logging.getLogger(__name__)

IMAGE_CONTENT_TYPES: Final[frozenset[str]] = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_COVER_BYTES: Final[int] = 5 * 1024 * 1024


def configure_cloudinary() -> None:
    if not (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured.",
        )
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


async def read_upload(file: UploadFile, *, max_bytes: int) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File is too large. Maximum size is {max_bytes // (1024 * 1024)}MB.",
        )
    return data


def build_public_image_url(public_id: str, *, version: int | None = None, transforms: str = "w_800,h_800,c_limit,q_auto,f_auto") -> str:
    cloud_name = settings.cloudinary_cloud_name.strip()
    base = f"https://res.cloudinary.com/{cloud_name}/image/upload/{transforms}"
    if version is not None:
        return f"{base}/v{version}/{public_id}"
    return f"{base}/{public_id}"


async def upload_product_cover(product_id: str, file: UploadFile) -> tuple[str, int | None, str]:
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cover must be JPEG, PNG, or WebP.")
    raw_bytes = await read_upload(file, max_bytes=MAX_COVER_BYTES)
    configure_cloudinary()
    public_id = f"products/{product_id}/cover"
    try:
        result = cloudinary.uploader.upload(raw_bytes, public_id=public_id, overwrite=True, resource_type="image")
    except CloudinaryError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Cover upload failed: {exc}") from exc
    version = int(result["version"]) if result.get("version") is not None else None
    return public_id, version, build_public_image_url(public_id, version=version)


async def upload_product_file(product_id: str, file: UploadFile) -> tuple[str, str]:
    raw_bytes = await read_upload(file, max_bytes=settings.product_max_file_bytes)
    configure_cloudinary()
    public_id = f"products/{product_id}/file"
    file_name = file.filename or "download"
    try:
        cloudinary.uploader.upload(
            raw_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="raw",
            type="private",
        )
    except CloudinaryError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"File upload failed: {exc}") from exc
    return public_id, file_name


def generate_signed_private_download_url(public_id: str, *, expires_in_seconds: int = 300) -> str:
    configure_cloudinary()
    expires_at = int(time.time()) + expires_in_seconds
    return cloudinary.utils.cloudinary_url(
        public_id,
        resource_type="raw",
        type="private",
        sign_url=True,
        secure=True,
        expires_at=expires_at,
    )
