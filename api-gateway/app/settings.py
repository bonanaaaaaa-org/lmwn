"""Runtime settings, read from environment variables (or a local ``.env``)."""

from functools import lru_cache

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    guide_service_url: AnyHttpUrl = AnyHttpUrl("http://localhost:8888")
    restaurant_service_url: AnyHttpUrl = AnyHttpUrl("http://localhost:9999")
    upstream_timeout_seconds: float = 5.0
    cors_allowed_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
