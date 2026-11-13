import pytest
from app.settings import Settings


def test_settings_defaults_point_at_local_services() -> None:
    settings = Settings()

    assert str(settings.guide_service_url) == "http://localhost:8888/"
    assert str(settings.restaurant_service_url) == "http://localhost:9999/"


def test_settings_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTREAM_TIMEOUT_SECONDS", "1.5")

    assert Settings().upstream_timeout_seconds == 1.5
