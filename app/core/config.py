"""Application settings — loaded from .env via pydantic-settings."""

from __future__ import annotations

from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings for the DEALR backend.

    Every field maps to an environment variable. Validated at startup so
    misconfigurations fail fast, not at 3 AM during the demo.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── 1. Runtime ──────────────────────────────────────────────────────
    ENV: Literal["development", "test", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # ── 2. Database (Supabase) ──────────────────────────────────────────
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""
    SUPABASE_PROJECT_REF: str = ""

    # ── 3. Cache & queue (Upstash Redis) ────────────────────────────────
    REDIS_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    CELERY_WORKER_CONCURRENCY: int = 4

    # ── 4. Auth & crypto ────────────────────────────────────────────────
    JWT_SECRET: str
    JWT_ACCESS_TTL_MIN: int = 15
    JWT_REFRESH_TTL_DAYS: int = 7
    BVN_SALT: str
    SHARE_LINK_SECRET: str
    SHARE_LINK_TTL_DAYS: int = 30

    # ── 5. Squad API ───────────────────────────────────────────────────
    SQUAD_BASE_URL: str
    SQUAD_SECRET_KEY: str
    SQUAD_PUBLIC_KEY: str = ""
    SQUAD_MERCHANT_ID: str
    SQUAD_BENEFICIARY_ACCOUNT: str = ""
    SQUAD_WEBHOOK_ALLOWED_IPS: str = ""
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    SQUAD_DVA_POOL_SIZE: int = 5
    SQUAD_DVA_DEFAULT_DURATION: int = 86400

    # ── 6. AI services ──────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-pro"
    VOYAGE_API_KEY: str = ""
    VOYAGE_MODEL: str = "voyage-3-lite"
    VOYAGE_DIMS: int = 384
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_MODEL: str = "nova-3"

    # ── 7. Notifications ────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    SMS_SENDER_ID: str = "DEALR"

    # ── 8. CORS & rate limits ───────────────────────────────────────────
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"
    RATE_LIMIT_AUTH_PER_MIN: int = 60
    RATE_LIMIT_DATA_PER_MIN: int = 600

    # ── 9. Demo / sandbox helpers ───────────────────────────────────────
    ADMIN_ROUTES_ENABLED: bool = True
    DEMO_BVN_TOPE: str = ""
    DEMO_BVN_ADAEZE: str = ""
    DEMO_BVN_MUSA: str = ""
    DEMO_BVN_FEMI: str = ""
    DEALR_FEE_BPS: int = 200

    # ── Validators ──────────────────────────────────────────────────────

    @field_validator("DATABASE_URL")
    @classmethod
    def _validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must start with 'postgresql+asyncpg://'. "
                "Got prefix: " + v[:30]
            )
        return v

    @field_validator("SQUAD_BASE_URL")
    @classmethod
    def _validate_squad_base_url(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("SQUAD_BASE_URL must start with 'https://'")
        return v

    @field_validator("REDIS_URL", "CELERY_BROKER_URL", "CELERY_RESULT_BACKEND")
    @classmethod
    def _validate_redis_url(cls, v: str) -> str:
        if not (v.startswith("rediss://") or v.startswith("redis://")):
            raise ValueError("Redis URLs must start with 'redis://' or 'rediss://'")
        return v

    @model_validator(mode="after")
    def _validate_test_db_url(self) -> Settings:
        if self.TEST_DATABASE_URL and not self.TEST_DATABASE_URL.startswith(
            "postgresql+asyncpg://"
        ):
            raise ValueError(
                "TEST_DATABASE_URL must start with 'postgresql+asyncpg://' when set"
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def squad_webhook_allowed_ips_list(self) -> list[str]:
        """Parse comma-separated webhook IPs into a list."""
        return [ip.strip() for ip in self.SQUAD_WEBHOOK_ALLOWED_IPS.split(",") if ip.strip()]


def get_settings() -> Settings:
    """Cached settings factory. Call once at startup."""
    return Settings()  # type: ignore[call-arg]
