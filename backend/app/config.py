from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Accept plain Neon postgresql:// URLs and use the psycopg v3 driver."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./linkbio.db"
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3003"
    frontend_url: str = "http://localhost:3000"

    # Mail / SMTP — values from .env (MAIL_FROM, SMTP_HOST, etc.)
    mail_from: str = ""
    mail_from_name: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_ssl: bool = False
    otp_expire_minutes: int = 10

    # Offline GeoIP — absolute path recommended; relative paths resolve from backend/
    # Default fallback: backend/app/services/GeoLite2-Country.mmdb
    geolite2_country_path: str = ""

    # Paystack billing
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_monthly_base_amount_ngn: float = 500
    paystack_yearly_discount_percent: float = 15.0
    billing_past_due_grace_days: int = 3
    billing_manual_renewal_reminder_days: int = 3

    @property
    def paystack_yearly_base_amount_ngn(self) -> float:
        """Yearly plan = 12× monthly minus the configured discount (default 15%)."""
        discount = self.paystack_yearly_discount_percent / 100
        return round(self.paystack_monthly_base_amount_ngn * 12 * (1 - discount), 2)

    @property
    def paystack_configured(self) -> bool:
        return bool(self.paystack_secret_key and self.paystack_public_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)


settings = Settings()

SITE_NAME = "Smasduq LinkBio"
