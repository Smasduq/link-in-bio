from datetime import datetime, timezone

from app.database import SessionLocal, ensure_db
from app.models.analytics import PageView
from app.models.profile import Profile
from app.services.click_context import hash_visitor_ip
from app.services.unique_visitors import get_unique_visitors_by_day, get_unique_visitors_total


def test_unique_visitors_count_distinct_hashes():
    ensure_db()
    db = SessionLocal()
    profile = db.query(Profile).first()
    if profile is None:
        db.close()
        return

    db.query(PageView).filter(PageView.profile_id == profile.id).delete()
    secret = "test-secret"
    ua_a = "Mozilla/5.0 Chrome"
    ua_b = "Mozilla/5.0 iPhone"
    now = datetime.now(timezone.utc)

    db.add_all(
        [
            PageView(
                profile_id=profile.id,
                visitor_hash=hash_visitor_ip("198.51.100.1", ua_a, secret),
                viewed_at=now,
            ),
            PageView(
                profile_id=profile.id,
                visitor_hash=hash_visitor_ip("198.51.100.1", ua_a, secret),
                viewed_at=now,
            ),
            PageView(
                profile_id=profile.id,
                visitor_hash=hash_visitor_ip("198.51.100.2", ua_b, secret),
                viewed_at=now,
            ),
            PageView(
                profile_id=profile.id,
                visitor_hash=None,
                viewed_at=now,
            ),
        ]
    )
    db.commit()

    assert get_unique_visitors_total(db, profile.id) == 2

    by_day = get_unique_visitors_by_day(db, profile.id, days=1)
    assert len(by_day) == 1
    assert by_day[0].unique_visitors == 2

    db.query(PageView).filter(PageView.profile_id == profile.id).delete()
    db.commit()
    db.close()
