"""Apply schema migrations to the Neon PostgreSQL database from .env."""

from pathlib import Path

from sqlalchemy import create_engine, text

from app.config import normalize_database_url


def neon_database_url() -> str:
    env_text = Path(".env").read_text(encoding="utf-8")
    for line in env_text.splitlines():
        stripped = line.lstrip("#").strip()
        if stripped.startswith("DATABASE_URL=postgresql"):
            return normalize_database_url(stripped.split("=", 1)[1].strip())
    raise SystemExit("No PostgreSQL DATABASE_URL found in .env")


def main() -> None:
    engine = create_engine(
        neon_database_url(),
        connect_args={"connect_timeout": 15},
        pool_pre_ping=True,
    )

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'links' AND column_name = 'is_featured'
                """
            )
        ).fetchone()
        if row:
            print("Neon: is_featured column already exists")
            return

        conn.execute(
            text("ALTER TABLE links ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false")
        )
        print("Neon: added is_featured column")


if __name__ == "__main__":
    main()
