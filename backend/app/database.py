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
            ("last_paystack_reference", "ALTER TABLE users ADD COLUMN last_paystack_reference VARCHAR(255)"),
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
        ("last_paystack_reference", "ALTER TABLE users ADD COLUMN last_paystack_reference VARCHAR(255)"),
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

        _migrate_link_clicks_schema(conn, is_sqlite=False)
        _migrate_page_views_schema(conn, is_sqlite=False)
        _migrate_users_billing_schema(conn, is_sqlite=False)


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

        _migrate_link_clicks_schema(conn, is_sqlite=True)
        _migrate_page_views_schema(conn, is_sqlite=True)
        _migrate_users_billing_schema(conn, is_sqlite=True)
