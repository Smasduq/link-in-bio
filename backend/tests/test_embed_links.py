import pytest
from fastapi import HTTPException

from app.services.embed_links import (
    detect_embed_type,
    parse_spotify_url,
    parse_youtube_url,
)


def test_parse_youtube_watch_url():
    result = parse_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert result["video_id"] == "dQw4w9WgXcQ"
    assert result["embed_src"] == "https://www.youtube.com/embed/dQw4w9WgXcQ"


def test_parse_youtube_short_url():
    result = parse_youtube_url("https://youtu.be/dQw4w9WgXcQ")
    assert result["video_id"] == "dQw4w9WgXcQ"


def test_parse_youtube_shorts_url():
    result = parse_youtube_url("https://www.youtube.com/shorts/dQw4w9WgXcQ")
    assert result["video_id"] == "dQw4w9WgXcQ"


def test_parse_youtube_rejects_channel_url():
    with pytest.raises(HTTPException) as exc:
        parse_youtube_url("https://www.youtube.com/@somechannel")
    assert exc.value.status_code == 400


def test_parse_youtube_rejects_invalid_id():
    with pytest.raises(HTTPException) as exc:
        parse_youtube_url("https://www.youtube.com/watch?v=bad")
    assert exc.value.status_code == 400


def test_parse_spotify_track_url():
    track_id = "4cOdK2wGLETKBW3PvgPWqT"
    result = parse_spotify_url(f"https://open.spotify.com/track/{track_id}?si=abc")
    assert result["spotify_type"] == "track"
    assert result["spotify_id"] == track_id
    assert result["embed_src"] == f"https://open.spotify.com/embed/track/{track_id}"


def test_parse_spotify_playlist_url():
    playlist_id = "37i9dQZF1DXcBWIGoYBM5M"
    result = parse_spotify_url(f"https://open.spotify.com/playlist/{playlist_id}")
    assert result["spotify_type"] == "playlist"
    assert result["spotify_id"] == playlist_id


def test_parse_spotify_rejects_invalid_url():
    with pytest.raises(HTTPException) as exc:
        parse_spotify_url("https://open.spotify.com/artist/abc")
    assert exc.value.status_code == 400


def test_detect_embed_type():
    assert detect_embed_type("https://youtu.be/dQw4w9WgXcQ") == "youtube_embed"
    assert detect_embed_type("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT") == "spotify_embed"
    assert detect_embed_type("https://example.com") is None
