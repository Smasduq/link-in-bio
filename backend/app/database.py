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
