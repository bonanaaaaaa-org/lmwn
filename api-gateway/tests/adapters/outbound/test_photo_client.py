import httpx
import pytest
import respx

from app.adapters.outbound.data_server.photo_client import create_photo_source
from app.application.errors import PhotoNotFound, SourceTimeout, SourceUnavailable
from app.application.ports.photo_source import PhotoImage, PhotoSource

PHOTO_SERVICE = "http://photos.test"
JPEG = b"\xff\xd8\xff\xe0fake-jpeg"


@pytest.fixture
def source(http_client: httpx.AsyncClient) -> PhotoSource:
    return create_photo_source(http_client, PHOTO_SERVICE + "/")


@pytest.mark.parametrize(
    ("file", "media_type"),
    [
        ("20240902_091058.jpg", "image/jpeg"),
        ("a.JPEG", "image/jpeg"),
        ("a.png", "image/png"),
        ("a.webp", "image/webp"),
        ("a.gif", "application/octet-stream"),
    ],
)
async def test_returns_the_bytes_with_a_media_type_from_the_extension(
    upstream: respx.MockRouter, source: PhotoSource, file: str, media_type: str
) -> None:
    # The image service sends every image as text/plain.
    upstream.get(f"{PHOTO_SERVICE}/r/480/854/{file}").respond(
        content=JPEG, headers={"Content-Type": "text/plain"}
    )

    photo = await source.get_photo(480, 854, file)

    assert photo == PhotoImage(content=JPEG, media_type=media_type)


async def test_the_file_name_is_percent_encoded_into_one_path_segment(
    upstream: respx.MockRouter, source: PhotoSource
) -> None:
    route = upstream.get(url__regex=r".*").respond(content=JPEG)

    await source.get_photo(1, 1, "../../etc/passwd")

    assert route.calls.last.request.url.raw_path == b"/r/1/1/..%2F..%2Fetc%2Fpasswd"


@pytest.mark.parametrize(
    "response",
    [httpx.Response(200, content=b""), httpx.Response(404)],
)
async def test_a_missing_image_raises_photo_not_found(
    upstream: respx.MockRouter, source: PhotoSource, response: httpx.Response
) -> None:
    upstream.get(f"{PHOTO_SERVICE}/r/1/1/x.jpg").mock(return_value=response)

    with pytest.raises(PhotoNotFound):
        await source.get_photo(1, 1, "x.jpg")


@pytest.mark.parametrize(
    ("side_effect", "error"),
    [
        (httpx.ReadTimeout("slow"), SourceTimeout),
        (httpx.ConnectError("refused"), SourceUnavailable),
        (httpx.Response(500), SourceUnavailable),
    ],
)
async def test_upstream_failures_raise_application_errors(
    upstream: respx.MockRouter,
    source: PhotoSource,
    side_effect: Exception | httpx.Response,
    error: type[Exception],
) -> None:
    upstream.get(f"{PHOTO_SERVICE}/r/1/1/x.jpg").mock(side_effect=[side_effect])

    with pytest.raises(error):
        await source.get_photo(1, 1, "x.jpg")
