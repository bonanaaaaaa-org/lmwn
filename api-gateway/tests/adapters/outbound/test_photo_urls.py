import pytest

from app.adapters.outbound.data_server.photo_urls import create_photo_url

PHOTO_SERVICE = "http://localhost:7777/"
UPSTREAM_PHOTO = "http://localhost:7777/r/854/480/20240902_091058.jpg"


def test_without_a_public_base_url_photo_urls_are_unchanged() -> None:
    photo_url = create_photo_url(PHOTO_SERVICE, None)

    assert photo_url(UPSTREAM_PHOTO) == UPSTREAM_PHOTO


@pytest.mark.parametrize(
    "public_base_url",
    ["https://api.example", "https://api.example/"],
)
def test_photo_service_urls_move_to_the_gateway_photos_route(
    public_base_url: str,
) -> None:
    photo_url = create_photo_url(PHOTO_SERVICE, public_base_url)

    assert (
        photo_url(UPSTREAM_PHOTO)
        == "https://api.example/photos/r/854/480/20240902_091058.jpg"
    )


def test_a_public_base_url_with_a_path_keeps_it() -> None:
    photo_url = create_photo_url(PHOTO_SERVICE, "https://example.dev/api/")

    assert (
        photo_url(UPSTREAM_PHOTO)
        == "https://example.dev/api/photos/r/854/480/20240902_091058.jpg"
    )


def test_origin_comparison_ignores_case_and_default_ports() -> None:
    photo_url = create_photo_url("http://LocalHost:80", "https://api.example")

    assert (
        photo_url("http://localhost/r/1/1/x.jpg")
        == "https://api.example/photos/r/1/1/x.jpg"
    )


@pytest.mark.parametrize(
    "url",
    [
        "https://cdn.example/r/854/480/x.jpg",  # another host
        "https://localhost:7777/r/854/480/x.jpg",  # another scheme
        "http://localhost:8888/r/854/480/x.jpg",  # another port
        "http://localhost:7777/images/x.jpg",  # not the resize route
        "http://localhost:7777/r",  # no `/r/` path
        "http://[::1/r/1/1/x.jpg",  # unparseable
        "",
    ],
)
def test_other_urls_are_left_unchanged(url: str) -> None:
    photo_url = create_photo_url(PHOTO_SERVICE, "https://api.example")

    assert photo_url(url) == url
