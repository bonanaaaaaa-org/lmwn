from collections.abc import Iterator

import pytest
from httpx import AsyncClient

from app.adapters.inbound.http.dependencies import get_photo_source
from app.application.errors import SourceTimeout
from app.application.ports.photo_source import PhotoImage
from app.main import app
from tests.fakes import FakePhotoSource

PNG = PhotoImage(content=b"\x89PNG fake", media_type="image/png")


@pytest.fixture
def photos() -> FakePhotoSource:
    return FakePhotoSource(photos={(480, 854, "a.png"): PNG})


@pytest.fixture(autouse=True)
def use_fakes(photos: FakePhotoSource) -> Iterator[None]:
    app.dependency_overrides[get_photo_source] = lambda: photos
    yield
    app.dependency_overrides.clear()


async def test_serves_the_source_image_as_its_media_type(
    client: AsyncClient, photos: FakePhotoSource
) -> None:
    response = await client.get("/photos/r/480/854/a.png")

    assert response.status_code == 200
    assert response.content == PNG.content
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "public, max-age=86400"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert photos.calls == [(480, 854, "a.png")]


async def test_an_unknown_photo_is_404(client: AsyncClient) -> None:
    response = await client.get("/photos/r/480/854/missing.png")

    assert response.status_code == 404
    assert response.json() == {"detail": "Photo not found"}


@pytest.mark.parametrize(
    "path", ["/photos/r/2049/854/a.png", "/photos/r/480/854/..%2Fa.png"]
)
async def test_a_rejected_request_never_reaches_the_source(
    client: AsyncClient, photos: FakePhotoSource, path: str
) -> None:
    response = await client.get(path)

    assert response.status_code == 404
    assert photos.calls == []


async def test_a_source_timeout_is_504(
    client: AsyncClient, photos: FakePhotoSource
) -> None:
    photos.failure = SourceTimeout("slow")

    response = await client.get("/photos/r/480/854/a.png")

    assert response.status_code == 504
    assert response.json() == {"detail": "An upstream service timed out"}
