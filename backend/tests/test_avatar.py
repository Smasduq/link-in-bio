import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from app.services.avatar import (
    MAX_UPLOAD_BYTES,
    build_avatar_delivery_url,
    resolve_profile_avatar_url,
    upload_avatar,
)


def test_build_avatar_delivery_url_with_transforms():
    with patch("app.services.avatar.settings") as mock_settings:
        mock_settings.cloudinary_cloud_name = "demo"
        url = build_avatar_delivery_url("avatars/user-1")
        assert (
            url
            == "https://res.cloudinary.com/demo/image/upload/w_512,h_512,c_fill,g_face,q_auto,f_auto/avatars/user-1"
        )


def test_build_avatar_delivery_url_includes_version_for_cache_busting():
    with patch("app.services.avatar.settings") as mock_settings:
        mock_settings.cloudinary_cloud_name = "demo"
        url = build_avatar_delivery_url("avatars/user-1", version=1710000000)
        assert (
            url
            == "https://res.cloudinary.com/demo/image/upload/w_512,h_512,c_fill,g_face,q_auto,f_auto/v1710000000/avatars/user-1"
        )


def test_resolve_profile_avatar_url_uses_cloudinary_public_id():
    profile = MagicMock(
        avatar_public_id="avatars/user-1",
        avatar_version=42,
        avatar_url=None,
    )
    with patch("app.services.avatar.settings") as mock_settings:
        mock_settings.cloudinary_cloud_name = "demo"
        assert resolve_profile_avatar_url(profile).endswith("/v42/avatars/user-1")


def test_resolve_profile_avatar_url_uses_placeholder_when_missing():
    profile = MagicMock(avatar_public_id=None, avatar_version=None, avatar_url=None)
    with patch("app.services.avatar.settings") as mock_settings:
        mock_settings.default_avatar_url = "https://example.com/linkbio-mark.png"
        assert resolve_profile_avatar_url(profile) == "https://example.com/linkbio-mark.png"


@pytest.mark.asyncio
async def test_upload_avatar_rejects_oversized_file():
    file = UploadFile(filename="big.jpg", file=io.BytesIO(b"x" * (MAX_UPLOAD_BYTES + 1)))
    file.content_type = "image/jpeg"

    with pytest.raises(HTTPException) as exc:
        await upload_avatar("user-1", file)

    assert exc.value.status_code == 400
    assert "5MB" in exc.value.detail


@pytest.mark.asyncio
async def test_upload_avatar_success():
    file = UploadFile(filename="avatar.jpg", file=io.BytesIO(b"fake-image-bytes"))
    file.content_type = "image/jpeg"

    with (
        patch("app.services.avatar.settings") as mock_settings,
        patch("app.services.avatar.cloudinary.uploader.upload") as mock_upload,
    ):
        mock_settings.cloudinary_cloud_name = "demo"
        mock_settings.cloudinary_api_key = "key"
        mock_settings.cloudinary_api_secret = "secret"
        mock_upload.return_value = {"version": 1710000000}

        result = await upload_avatar("user-123", file)

    assert result.public_id == "avatars/user-123"
    assert result.version == 1710000000
    assert "w_512,h_512,c_fill,g_face,q_auto,f_auto" in result.delivery_url
    mock_upload.assert_called_once_with(
        b"fake-image-bytes",
        public_id="avatars/user-123",
        overwrite=True,
        resource_type="image",
    )
