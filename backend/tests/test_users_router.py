"""Ensure user routes (avatar upload) are registered on the app."""

from fastapi.testclient import TestClient

from app.main import app


def test_avatar_upload_route_is_registered():
    client = TestClient(app)
    response = client.post("/api/users/me/avatar")
    assert response.status_code != 404
