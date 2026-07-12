import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from app.services.avatar import (
    MAX_UPLOAD_BYTES,
    _process_image,
    _validate_content_type,
    resolve_avatar_url,
    upload_avatar,
)


def test_resolve_avatar_url_uses_placeholder_when_missing():
    with patch("app.services.avatar.settings") as mock_settings:
        mock_settings.default_avatar_url = "https://example.com/linkbio-mark.png"
        assert resolve_avatar_url(None) == "https://example.com/linkbio-mark.png"
        assert resolve_avatar_url("  ") == "https://example.com/linkbio-mark.png"


def test_resolve_avatar_url_keeps_custom_value():
    url = "https://huggingface.co/datasets/org/repo/resolve/main/avatars/u1.webp"
    assert resolve_avatar_url(url) == url


def test_validate_content_type_rejects_pdf():
    with pytest.raises(HTTPException) as exc:
        _validate_content_type("application/pdf")
    assert exc.value.status_code == 400


def test_process_image_outputs_webp():
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (1200, 800), color="#336699").save(buffer, format="JPEG")
    webp = _process_image(buffer.getvalue())
    assert webp.startswith(b"RIFF")
    assert len(webp) < len(buffer.getvalue())


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
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (640, 640), color="#224466").save(buffer, format="PNG")
    buffer.seek(0)

    file = UploadFile(filename="avatar.png", file=buffer)
    file.content_type = "image/png"

    with (
        patch("app.services.avatar.settings") as mock_settings,
        patch("app.services.avatar.HfApi") as mock_hf_api,
    ):
        mock_settings.hf_token = "hf_test"
        mock_settings.hf_repo_id = "org/linkbio-avatars"
        mock_hf_api.return_value.upload_file = MagicMock()

        url = await upload_avatar("user-123", file)

    assert url == "https://huggingface.co/datasets/org/linkbio-avatars/resolve/main/avatars/user-123.webp"
    mock_hf_api.return_value.upload_file.assert_called_once()
