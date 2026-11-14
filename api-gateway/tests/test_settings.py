import pytest

from app.settings import Settings


def test_settings_defaults_point_at_local_services() -> None:
    settings = Settings()

    assert str(settings.guide_service_url) == "http://localhost:8888/"
    assert str(settings.restaurant_service_url) == "http://localhost:9999/"


def test_settings_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTREAM_TIMEOUT_SECONDS", "1.5")

    assert Settings().upstream_timeout_seconds == 1.5


def test_upstream_reads_are_cached_for_60_seconds_by_default() -> None:
    assert Settings().cache_ttl_seconds == 60


def test_cache_ttl_reads_from_env_and_must_be_positive(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CACHE_TTL_SECONDS", "5")
    assert Settings().cache_ttl_seconds == 5

    monkeypatch.setenv("CACHE_TTL_SECONDS", "0")
    with pytest.raises(ValueError):
        Settings()


def test_photo_settings_default_to_the_local_image_service_without_rewriting() -> None:
    settings = Settings()

    assert str(settings.photo_service_url) == "http://localhost:7777/"
    assert settings.public_base_url is None


def test_photo_settings_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PHOTO_SERVICE_URL", "http://localhost:7000")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://api-hidden-gems.example.dev")

    settings = Settings()

    assert str(settings.photo_service_url) == "http://localhost:7000/"
    assert str(settings.public_base_url) == "https://api-hidden-gems.example.dev/"
