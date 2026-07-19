from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_is_sqlite = settings.sqlalchemy_database_url.startswith("sqlite")
connect_args: dict = {"check_same_thread": False} if _is_sqlite else {"connect_timeout": 10}
engine_kwargs: dict = {
    "connect_args": connect_args,
    "pool_pre_ping": not _is_sqlite,
}
if not _is_sqlite:
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(settings.sqlalchemy_database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


_db_initialized = False


def ensure_db() -> None:
    global _db_initialized
    if _db_initialized:
        return
    init_db()
    _db_initialized = True


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_schema()
    _migrate_postgres_schema()


def _migrate_page_views_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(page_views)")).fetchall()
        names = {row[1] for row in columns}
        if "device_type" not in names:
            conn.execute(
                text("ALTER TABLE page_views ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'desktop'")
            )
        if "country" not in names:
            conn.execute(text("ALTER TABLE page_views ADD COLUMN country VARCHAR(2)"))
        if "visitor_hash" not in names:
            conn.execute(text("ALTER TABLE page_views ADD COLUMN visitor_hash VARCHAR(64)"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_page_views_visitor_hash ON page_views (visitor_hash)")
        )
        return

    for column, ddl in (
        ("device_type", "ALTER TABLE page_views ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'desktop'"),
        ("country", "ALTER TABLE page_views ADD COLUMN country VARCHAR(2)"),
        ("visitor_hash", "ALTER TABLE page_views ADD COLUMN visitor_hash VARCHAR(64)"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'page_views' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))

    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_page_views_visitor_hash
            ON page_views (visitor_hash)
            """
        )
    )


def _migrate_link_clicks_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(link_clicks)")).fetchall()
        names = {row[1] for row in columns}
        if "device_type" not in names:
            conn.execute(
                text("ALTER TABLE link_clicks ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'desktop'")
            )
        if "country" not in names:
            conn.execute(text("ALTER TABLE link_clicks ADD COLUMN country VARCHAR(2)"))
        if "visitor_hash" not in names:
            conn.execute(text("ALTER TABLE link_clicks ADD COLUMN visitor_hash VARCHAR(64)"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_link_clicks_visitor_hash ON link_clicks (visitor_hash)")
        )
        return

    for column, ddl in (
        ("device_type", "ALTER TABLE link_clicks ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'desktop'"),
        ("country", "ALTER TABLE link_clicks ADD COLUMN country VARCHAR(2)"),
        ("visitor_hash", "ALTER TABLE link_clicks ADD COLUMN visitor_hash VARCHAR(64)"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'link_clicks' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))

    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_link_clicks_visitor_hash
            ON link_clicks (visitor_hash)
            """
        )
    )


def _migrate_users_billing_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        names = {row[1] for row in columns}
        additions = [
            ("is_premium", "ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0"),
            ("premium_plan", "ALTER TABLE users ADD COLUMN premium_plan VARCHAR(20)"),
            ("premium_period_end", "ALTER TABLE users ADD COLUMN premium_period_end DATETIME"),
            ("paystack_subscription_code", "ALTER TABLE users ADD COLUMN paystack_subscription_code VARCHAR(255)"),
            ("paystack_customer_code", "ALTER TABLE users ADD COLUMN paystack_customer_code VARCHAR(255)"),
            ("paystack_email_token", "ALTER TABLE users ADD COLUMN paystack_email_token VARCHAR(255)"),
            ("subscription_status", "ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20)"),
            ("premium_grace_until", "ALTER TABLE users ADD COLUMN premium_grace_until DATETIME"),
            ("renewal_type", "ALTER TABLE users ADD COLUMN renewal_type VARCHAR(10)"),
            ("manual_renewal_reminder_sent_at", "ALTER TABLE users ADD COLUMN manual_renewal_reminder_sent_at DATETIME"),
            ("last_paystack_reference", "ALTER TABLE users ADD COLUMN last_paystack_reference VARCHAR(255)"),
            ("is_trial", "ALTER TABLE users ADD COLUMN is_trial BOOLEAN NOT NULL DEFAULT 0"),
            ("trial_ends_at", "ALTER TABLE users ADD COLUMN trial_ends_at DATETIME"),
            ("trial_used", "ALTER TABLE users ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT 0"),
        ]
        for column, ddl in additions:
            if column not in names:
                conn.execute(text(ddl))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_users_paystack_subscription_code "
                "ON users (paystack_subscription_code)"
            )
        )
        return

    for column, ddl in (
        ("is_premium", "ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false"),
        ("premium_plan", "ALTER TABLE users ADD COLUMN premium_plan VARCHAR(20)"),
        ("premium_period_end", "ALTER TABLE users ADD COLUMN premium_period_end TIMESTAMPTZ"),
        ("paystack_subscription_code", "ALTER TABLE users ADD COLUMN paystack_subscription_code VARCHAR(255)"),
        ("paystack_customer_code", "ALTER TABLE users ADD COLUMN paystack_customer_code VARCHAR(255)"),
        ("paystack_email_token", "ALTER TABLE users ADD COLUMN paystack_email_token VARCHAR(255)"),
        ("subscription_status", "ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20)"),
        ("premium_grace_until", "ALTER TABLE users ADD COLUMN premium_grace_until TIMESTAMPTZ"),
        ("renewal_type", "ALTER TABLE users ADD COLUMN renewal_type VARCHAR(10)"),
        ("manual_renewal_reminder_sent_at", "ALTER TABLE users ADD COLUMN manual_renewal_reminder_sent_at TIMESTAMPTZ"),
        ("last_paystack_reference", "ALTER TABLE users ADD COLUMN last_paystack_reference VARCHAR(255)"),
        ("is_trial", "ALTER TABLE users ADD COLUMN is_trial BOOLEAN NOT NULL DEFAULT false"),
        ("trial_ends_at", "ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMPTZ"),
        ("trial_used", "ALTER TABLE users ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))

    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_users_paystack_subscription_code
            ON users (paystack_subscription_code)
            """
        )
    )


def _migrate_profiles_avatar_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(profiles)")).fetchall()
        names = {row[1] for row in columns}
        if "avatar_public_id" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN avatar_public_id VARCHAR(255)"))
        if "avatar_version" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN avatar_version INTEGER"))
        if "social_links" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN social_links JSON NOT NULL DEFAULT '[]'"))
        if "email_capture_enabled" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN email_capture_enabled BOOLEAN NOT NULL DEFAULT 0"))
        if "email_capture_heading" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN email_capture_heading VARCHAR(120)"))
        if "announcement_enabled" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN announcement_enabled BOOLEAN NOT NULL DEFAULT 0"))
        if "announcement_text" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN announcement_text VARCHAR(150)"))
        return

    for column, ddl in (
        ("avatar_public_id", "ALTER TABLE profiles ADD COLUMN avatar_public_id VARCHAR(255)"),
        ("avatar_version", "ALTER TABLE profiles ADD COLUMN avatar_version INTEGER"),
        ("social_links", "ALTER TABLE profiles ADD COLUMN social_links JSONB NOT NULL DEFAULT '[]'::jsonb"),
        ("email_capture_enabled", "ALTER TABLE profiles ADD COLUMN email_capture_enabled BOOLEAN NOT NULL DEFAULT false"),
        ("email_capture_heading", "ALTER TABLE profiles ADD COLUMN email_capture_heading VARCHAR(120)"),
        ("announcement_enabled", "ALTER TABLE profiles ADD COLUMN announcement_enabled BOOLEAN NOT NULL DEFAULT false"),
        ("announcement_text", "ALTER TABLE profiles ADD COLUMN announcement_text VARCHAR(150)"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'profiles' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))


def _migrate_push_engagement_schema(conn, is_sqlite: bool) -> None:
    user_columns = (
        {row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
        if is_sqlite
        else {
            row[0]
            for row in conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            ).fetchall()
        }
    )

    user_additions_sqlite = [
        ("timezone", "ALTER TABLE users ADD COLUMN timezone VARCHAR(64)"),
        ("last_login_at", "ALTER TABLE users ADD COLUMN last_login_at DATETIME"),
        ("last_morning_notification_date", "ALTER TABLE users ADD COLUMN last_morning_notification_date DATE"),
        ("last_evening_notification_date", "ALTER TABLE users ADD COLUMN last_evening_notification_date DATE"),
        ("last_weekly_summary_date", "ALTER TABLE users ADD COLUMN last_weekly_summary_date DATE"),
        ("last_inactivity_nudge_at", "ALTER TABLE users ADD COLUMN last_inactivity_nudge_at DATETIME"),
        ("clicks_milestone_sent", "ALTER TABLE users ADD COLUMN clicks_milestone_sent INTEGER NOT NULL DEFAULT 0"),
    ]
    user_additions_pg = [
        ("timezone", "ALTER TABLE users ADD COLUMN timezone VARCHAR(64)"),
        ("last_login_at", "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ"),
        ("last_morning_notification_date", "ALTER TABLE users ADD COLUMN last_morning_notification_date DATE"),
        ("last_evening_notification_date", "ALTER TABLE users ADD COLUMN last_evening_notification_date DATE"),
        ("last_weekly_summary_date", "ALTER TABLE users ADD COLUMN last_weekly_summary_date DATE"),
        ("last_inactivity_nudge_at", "ALTER TABLE users ADD COLUMN last_inactivity_nudge_at TIMESTAMPTZ"),
        ("clicks_milestone_sent", "ALTER TABLE users ADD COLUMN clicks_milestone_sent INTEGER NOT NULL DEFAULT 0"),
    ]

    for column, ddl in (user_additions_sqlite if is_sqlite else user_additions_pg):
        if column not in user_columns:
            conn.execute(text(ddl))


def _migrate_product_purchases_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(product_purchases)")).fetchall()
        names = {row[1] for row in columns}
        additions = [
            ("max_downloads", "ALTER TABLE product_purchases ADD COLUMN max_downloads INTEGER NOT NULL DEFAULT 3"),
            (
                "download_verify_attempts",
                "ALTER TABLE product_purchases ADD COLUMN download_verify_attempts INTEGER NOT NULL DEFAULT 0",
            ),
            (
                "download_verify_window_started_at",
                "ALTER TABLE product_purchases ADD COLUMN download_verify_window_started_at DATETIME",
            ),
        ]
        for column, ddl in additions:
            if column not in names:
                conn.execute(text(ddl))
        return

    for column, ddl in (
        ("max_downloads", "ALTER TABLE product_purchases ADD COLUMN max_downloads INTEGER NOT NULL DEFAULT 3"),
        (
            "download_verify_attempts",
            "ALTER TABLE product_purchases ADD COLUMN download_verify_attempts INTEGER NOT NULL DEFAULT 0",
        ),
        (
            "download_verify_window_started_at",
            "ALTER TABLE product_purchases ADD COLUMN download_verify_window_started_at TIMESTAMPTZ",
        ),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'product_purchases' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))


def _migrate_content_layout_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        profile_columns = conn.execute(text("PRAGMA table_info(profiles)")).fetchall()
        profile_names = {row[1] for row in profile_columns}
        profile_additions = [
            ("layout_mode", "ALTER TABLE profiles ADD COLUMN layout_mode VARCHAR(20) NOT NULL DEFAULT 'grouped'"),
            ("email_capture_position", "ALTER TABLE profiles ADD COLUMN email_capture_position INTEGER NOT NULL DEFAULT 0"),
        ]
        for column, ddl in profile_additions:
            if column not in profile_names:
                conn.execute(text(ddl))

        product_columns = conn.execute(text("PRAGMA table_info(products)")).fetchall()
        product_names = {row[1] for row in product_columns}
        if "position" not in product_names:
            conn.execute(text("ALTER TABLE products ADD COLUMN position INTEGER NOT NULL DEFAULT 0"))
        return

    for column, ddl in (
        ("layout_mode", "ALTER TABLE profiles ADD COLUMN layout_mode VARCHAR(20) NOT NULL DEFAULT 'grouped'"),
        ("email_capture_position", "ALTER TABLE profiles ADD COLUMN email_capture_position INTEGER NOT NULL DEFAULT 0"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'profiles' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))

    row = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'products' AND column_name = 'position'
            """
        )
    ).fetchone()
    if not row:
        conn.execute(text("ALTER TABLE products ADD COLUMN position INTEGER NOT NULL DEFAULT 0"))


def _migrate_users_admin_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        names = {row[1] for row in columns}
        additions = [
            ("role", "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"),
            ("is_suspended", "ALTER TABLE users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT 0"),
            ("suspended_at", "ALTER TABLE users ADD COLUMN suspended_at DATETIME"),
            ("suspended_reason", "ALTER TABLE users ADD COLUMN suspended_reason VARCHAR(500)"),
            ("manual_pro_grant", "ALTER TABLE users ADD COLUMN manual_pro_grant BOOLEAN NOT NULL DEFAULT 0"),
            ("manual_pro_reason", "ALTER TABLE users ADD COLUMN manual_pro_reason VARCHAR(500)"),
            ("deleted_at", "ALTER TABLE users ADD COLUMN deleted_at DATETIME"),
        ]
        for column, ddl in additions:
            if column not in names:
                conn.execute(text(ddl))
        return

    for column, ddl in (
        ("role", "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"),
        ("is_suspended", "ALTER TABLE users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false"),
        ("suspended_at", "ALTER TABLE users ADD COLUMN suspended_at TIMESTAMPTZ"),
        ("suspended_reason", "ALTER TABLE users ADD COLUMN suspended_reason VARCHAR(500)"),
        ("manual_pro_grant", "ALTER TABLE users ADD COLUMN manual_pro_grant BOOLEAN NOT NULL DEFAULT false"),
        ("manual_pro_reason", "ALTER TABLE users ADD COLUMN manual_pro_reason VARCHAR(500)"),
        ("deleted_at", "ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ"),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))


def _migrate_profiles_admin_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(profiles)")).fetchall()
        names = {row[1] for row in columns}
        if "profile_disabled" not in names:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN profile_disabled BOOLEAN NOT NULL DEFAULT 0"))
        return

    row = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles' AND column_name = 'profile_disabled'
            """
        )
    ).fetchone()
    if not row:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN profile_disabled BOOLEAN NOT NULL DEFAULT false"))


def _migrate_users_wallet_schema(conn, is_sqlite: bool) -> None:
    """Add wallet_balance and referred_by_id to the users table."""
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        names = {row[1] for row in columns}
        additions = [
            (
                "wallet_balance",
                "ALTER TABLE users ADD COLUMN wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00",
            ),
            (
                "referred_by_id",
                "ALTER TABLE users ADD COLUMN referred_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL",
            ),
        ]
        for column, ddl in additions:
            if column not in names:
                conn.execute(text(ddl))
        return

    for column, ddl in (
        (
            "wallet_balance",
            "ALTER TABLE users ADD COLUMN wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00",
        ),
        (
            "referred_by_id",
            "ALTER TABLE users ADD COLUMN referred_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL",
        ),
    ):
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = :column
                """
            ),
            {"column": column},
        ).fetchone()
        if not row:
            conn.execute(text(ddl))


def _migrate_product_purchases_refund_schema(conn, is_sqlite: bool) -> None:
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(product_purchases)")).fetchall()
        names = {row[1] for row in columns}
        if "refund_status" not in names:
            conn.execute(text("ALTER TABLE product_purchases ADD COLUMN refund_status VARCHAR(20)"))
        return

    row = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'product_purchases' AND column_name = 'refund_status'
            """
        )
    ).fetchone()
    if not row:
        conn.execute(text("ALTER TABLE product_purchases ADD COLUMN refund_status VARCHAR(20)"))


def _migrate_otp_referrer_schema(conn, is_sqlite: bool) -> None:
    """Add signup_referrer_id to otp_challenges for referral tracking."""
    if is_sqlite:
        columns = conn.execute(text("PRAGMA table_info(otp_challenges)")).fetchall()
        names = {row[1] for row in columns}
        if "signup_referrer_id" not in names:
            conn.execute(
                text("ALTER TABLE otp_challenges ADD COLUMN signup_referrer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL")
            )
        return

    row = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'otp_challenges' AND column_name = 'signup_referrer_id'
            """
        )
    ).fetchone()
    if not row:
        conn.execute(
            text("ALTER TABLE otp_challenges ADD COLUMN signup_referrer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL")
        )


def _migrate_postgres_schema() -> None:
    if _is_sqlite:
        return

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'links' AND column_name = 'is_featured'
                """
            )
        ).fetchone()
        if not row:
            conn.execute(text("ALTER TABLE links ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false"))

        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'links' AND column_name = 'type'
                """
            )
        ).fetchone()
        if not row:
            conn.execute(text("ALTER TABLE links ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'link'"))

        _migrate_link_clicks_schema(conn, is_sqlite=False)
        _migrate_page_views_schema(conn, is_sqlite=False)
        _migrate_users_billing_schema(conn, is_sqlite=False)
        _migrate_profiles_avatar_schema(conn, is_sqlite=False)
        _migrate_push_engagement_schema(conn, is_sqlite=False)
        _migrate_product_purchases_schema(conn, is_sqlite=False)
        _migrate_content_layout_schema(conn, is_sqlite=False)
        _migrate_users_admin_schema(conn, is_sqlite=False)
        _migrate_profiles_admin_schema(conn, is_sqlite=False)
        _migrate_product_purchases_refund_schema(conn, is_sqlite=False)
        _migrate_users_wallet_schema(conn, is_sqlite=False)
        _migrate_otp_referrer_schema(conn, is_sqlite=False)


def _migrate_sqlite_schema() -> None:
    if not _is_sqlite:
        return

    with engine.begin() as conn:
        user_columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_column_names = {row[1] for row in user_columns}
        if "email_verified_at" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME"))
            conn.execute(
                text("UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL")
            )

        link_columns = conn.execute(text("PRAGMA table_info(links)")).fetchall()
        link_column_names = {row[1] for row in link_columns}
        if "is_featured" not in link_column_names:
            conn.execute(text("ALTER TABLE links ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT 0"))
        if "type" not in link_column_names:
            conn.execute(text("ALTER TABLE links ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'link'"))

        _migrate_link_clicks_schema(conn, is_sqlite=True)
        _migrate_page_views_schema(conn, is_sqlite=True)
        _migrate_users_billing_schema(conn, is_sqlite=True)
        _migrate_profiles_avatar_schema(conn, is_sqlite=True)
        _migrate_push_engagement_schema(conn, is_sqlite=True)
        _migrate_product_purchases_schema(conn, is_sqlite=True)
        _migrate_content_layout_schema(conn, is_sqlite=True)
        _migrate_users_admin_schema(conn, is_sqlite=True)
        _migrate_profiles_admin_schema(conn, is_sqlite=True)
        _migrate_product_purchases_refund_schema(conn, is_sqlite=True)
        _migrate_users_wallet_schema(conn, is_sqlite=True)
        _migrate_otp_referrer_schema(conn, is_sqlite=True)
