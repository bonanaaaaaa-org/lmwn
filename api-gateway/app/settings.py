"""Runtime settings, read from environment variables (or a local ``.env``)."""

from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    guide_service_url: AnyHttpUrl = AnyHttpUrl("http://localhost:8888")
    restaurant_service_url: AnyHttpUrl = AnyHttpUrl("http://localhost:9999")
    upstream_timeout_seconds: float = 5.0
    cache_ttl_seconds: float = Field(default=60.0, gt=0)
    """How long a successful upstream read is served from memory."""
    photo_service_url: AnyHttpUrl = AnyHttpUrl("http://localhost:7777")
    # Set in production: photo URLs then point at the gateway's /photos route.
    public_base_url: AnyHttpUrl | None = None
    cors_allowed_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
