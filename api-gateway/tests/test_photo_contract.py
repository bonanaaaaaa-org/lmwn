"""Photos through the whole gateway: HTTP in, respx at the network.

With `PUBLIC_BASE_URL` set, photo URLs in Guide responses point at the gateway's
`/photos` route, which proxies the image service without letting a bad size or a
path-traversing file name reach it.
"""

from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
import respx

from app.adapters.inbound.http.dependencies import (
    get_guide_detail_use_case,
    get_list_guides_use_case,
    get_photo_source,
)
from app.composition import create_photo_source, create_use_cases
from app.main import app
from app.settings import Settings
from tests import upstream_fixtures as fx

PHOTO_SERVICE = "http://localhost:7777"
PUBLIC = "https://api.example"
COVER = "20240902_091058.jpg"
JPEG = b"\xff\xd8\xff\xe0fake-jpeg"


def settings(public_base_url: str | None) -> Settings:
    return Settings(
        guide_service_url=fx.GUIDE_SERVICE,  # pyrefly: ignore[bad-argument-type]
        restaurant_service_url=fx.RESTAURANT_SERVICE,  # pyrefly: ignore[bad-argument-type]
        photo_service_url=PHOTO_SERVICE,  # pyrefly: ignore[bad-argument-type]
        public_base_url=public_base_url,  # pyrefly: ignore[bad-argument-type]
        upstream_timeout_seconds=1,
    )


@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{fx.GUIDE_SERVICE}/guides").respond(json=[fx.GUIDE_ID])
        router.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").respond(json=fx.guide())
        for n, item_id in enumerate(fx.ITEM_IDS):
            router.get(f"{fx.GUIDE_SERVICE}/guide-items/{item_id}").respond(
                json=fx.guide_item(n)
            )
            router.get(
                f"{fx.RESTAURANT_SERVICE}/restaurants/{fx.RESTAURANT_IDS[n]}"
            ).respond(json=fx.restaurant(n))
        router.get(f"{PHOTO_SERVICE}/r/480/854/{COVER}").respond(
            content=JPEG, headers={"Content-Type": "text/plain"}
        )
        yield router


async def _gateway(public_base_url: str | None) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient() as upstream_client:
        config = settings(public_base_url)
        use_cases = create_use_cases(config, upstream_client)
        photos = create_photo_source(config, upstream_client)
        app.dependency_overrides[get_list_guides_use_case] = lambda: (
            use_cases.list_guides
        )
        app.dependency_overrides[get_guide_detail_use_case] = lambda: (
            use_cases.get_guide_detail
        )
        app.dependency_overrides[get_photo_source] = lambda: photos
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://gateway.test"
        ) as client:
            yield client
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def gateway(upstream: respx.MockRouter) -> AsyncIterator[httpx.AsyncClient]:
    async for client in _gateway(PUBLIC):
        yield client


@pytest_asyncio.fixture
async def local_gateway(
    upstream: respx.MockRouter,
) -> AsyncIterator[httpx.AsyncClient]:
    async for client in _gateway(None):
        yield client


def _photo_urls(body: object) -> list[str]:
    """Every `smallUrl` / `largeUrl` anywhere in a JSON body."""
    if isinstance(body, dict):
        return [
            url
            for key, value in body.items()
            for url in (
                [value] if key in ("smallUrl", "largeUrl") else _photo_urls(value)
            )
        ]
    if isinstance(body, list):
        return [url for value in body for url in _photo_urls(value)]
    return []


# --- Photo URL rewrite ----------------------------------------------------------


async def test_guide_list_photo_urls_point_at_the_gateway(
    gateway: httpx.AsyncClient,
) -> None:
    body = (await gateway.get("/guides")).json()

    assert body["items"][0]["coverPhoto"] == {
        "id": "63ce2123-b49a-49cc-bc13-80ed802a7894",
        "smallUrl": f"{PUBLIC}/photos/r/854/480/{COVER}",
        "largeUrl": f"{PUBLIC}/photos/r/1920/1080/{COVER}",
    }


async def test_guide_detail_photo_urls_point_at_the_gateway(
    gateway: httpx.AsyncClient,
) -> None:
    body = (await gateway.get(f"/guides/{fx.GUIDE_ID}")).json()

    urls = _photo_urls(body)
    assert len(urls) == 2 + 2 * 2 * len(fx.ITEM_IDS)  # cover + 2 photos per item
    assert all(url.startswith(f"{PUBLIC}/photos/r/") for url in urls)
    assert body["items"][0]["photos"][0]["smallUrl"] == (
        f"{PUBLIC}/photos/r/480/854/20250205_121420.jpg"
    )


async def test_without_a_public_base_url_photo_urls_are_unchanged(
    local_gateway: httpx.AsyncClient,
) -> None:
    listed = (await local_gateway.get("/guides")).json()
    detail = (await local_gateway.get(f"/guides/{fx.GUIDE_ID}")).json()

    assert listed["items"][0]["coverPhoto"]["smallUrl"] == (
        f"{PHOTO_SERVICE}/r/854/480/{COVER}"
    )
    assert all(url.startswith(f"{PHOTO_SERVICE}/r/") for url in _photo_urls(detail))


async def test_photo_urls_on_another_origin_are_left_unchanged(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    foreign = "https://cdn.example/r/854/480/x.jpg"
    guide = fx.guide() | {
        "coverPhoto": {"id": "p", "smallUrl": foreign, "largeUrl": foreign}
    }
    upstream.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").respond(json=guide)

    body = (await gateway.get("/guides")).json()

    assert body["items"][0]["coverPhoto"]["smallUrl"] == foreign


async def test_a_rewritten_photo_url_is_served_by_the_gateway(
    gateway: httpx.AsyncClient,
) -> None:
    detail = (await gateway.get(f"/guides/{fx.GUIDE_ID}")).json()
    photo_url = httpx.URL(detail["coverPhoto"]["smallUrl"])
    # The fixture's cover is 854x480; ask for the size the upstream mock serves.
    path = photo_url.path.replace("/854/480/", "/480/854/")

    response = await gateway.get(path)

    assert response.status_code == 200
    assert response.content == JPEG


# --- GET /photos/r/{width}/{height}/{file} ----------------------------------


async def test_serves_the_image_with_its_media_type_and_cache_headers(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get(f"/photos/r/480/854/{COVER}")

    assert response.status_code == 200
    assert response.content == JPEG
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "public, max-age=86400"
    assert response.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize(
    "path",
    [
        "/photos/r/0/854/x.jpg",
        "/photos/r/480/0/x.jpg",
        "/photos/r/2049/854/x.jpg",
        "/photos/r/480/2049/x.jpg",
        "/photos/r/-1/854/x.jpg",
        "/photos/r/0480/854/x.jpg",
        "/photos/r/abc/854/x.jpg",
        "/photos/r/99999/854/x.jpg",
        "/photos/r/1/1/x.jpg",
        "/photos/r/2048/2048/x.jpg",
        "/photos/r/481/854/x.jpg",
        "/photos/r/480/1920/x.jpg",
        "/photos/r/480/854/..%2F..%2Fetc%2Fpasswd",
        "/photos/r/480/854/..%2F..%2Fetc%2Fx.jpg",
        "/photos/r/480/854/%2e%2e",
        "/photos/r/480/854/%2e%2e%2fx.jpg",
        "/photos/r/480/854/a..b.jpg",
        "/photos/r/480/854/.hidden.jpg",
        "/photos/r/480/854/x.jpg%00.png",
        "/photos/r/480/854/x%5Cy.jpg",
        "/photos/r/480/854/sub/x.jpg",
        "/photos/r/480/854/x.gif",
        "/photos/r/480/854/x.svg",
        "/photos/r/480/854/x.jpg.txt",
        "/photos/r/480/854/x",
    ],
)
async def test_rejected_requests_are_404_without_calling_upstream(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter, path: str
) -> None:
    upstream.calls.reset()

    response = await gateway.get(path)

    assert response.status_code == 404
    assert response.json() == {"detail": "Photo not found"}
    assert not upstream.calls


@pytest.mark.parametrize(
    ("path", "upstream_url"),
    [
        ("/photos/r/854/480/X.JPG", f"{PHOTO_SERVICE}/r/854/480/X.JPG"),
        ("/photos/r/1080/1920/a.png", f"{PHOTO_SERVICE}/r/1080/1920/a.png"),
        (
            "/photos/r/1920/1080/a_b-c.d.webp",
            f"{PHOTO_SERVICE}/r/1920/1080/a_b-c.d.webp",
        ),
    ],
)
async def test_each_photo_size_and_plain_names_are_forwarded(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter, path: str, upstream_url: str
) -> None:
    upstream.get(upstream_url).respond(content=JPEG)

    response = await gateway.get(path)

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("upstream_response", "status_code", "detail"),
    [
        (httpx.Response(200, content=b""), 404, "Photo not found"),
        (httpx.Response(404), 404, "Photo not found"),
        (httpx.ReadTimeout("slow"), 504, "An upstream service timed out"),
        (httpx.Response(500), 502, "An upstream service is unavailable"),
        (httpx.ConnectError("refused"), 502, "An upstream service is unavailable"),
    ],
)
async def test_upstream_failures_map_to_safe_errors(
    gateway: httpx.AsyncClient,
    upstream: respx.MockRouter,
    upstream_response: Exception | httpx.Response,
    status_code: int,
    detail: str,
) -> None:
    upstream.get(f"{PHOTO_SERVICE}/r/480/854/{COVER}").mock(
        side_effect=[upstream_response]
    )

    response = await gateway.get(f"/photos/r/480/854/{COVER}")

    assert response.status_code == status_code
    assert response.json() == {"detail": detail}
    assert "localhost:7777" not in response.text
    assert "cache-control" not in response.headers


@pytest.mark.parametrize("method", ["POST", "PUT", "DELETE"])
async def test_only_get_is_allowed(gateway: httpx.AsyncClient, method: str) -> None:
    response = await gateway.request(method, f"/photos/r/480/854/{COVER}")

    assert response.status_code == 405


async def test_the_photo_route_is_documented(gateway: httpx.AsyncClient) -> None:
    schema = (await gateway.get("/openapi.json")).json()

    operation = schema["paths"]["/photos/r/{width}/{height}/{file}"]["get"]
    assert set(operation["responses"]) >= {"200", "404", "502", "504"}
    assert "image/jpeg" in operation["responses"]["200"]["content"]
