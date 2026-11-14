"""GET /guides through the whole gateway: HTTP in, respx at the network.

Payloads are shaped like the real data server's: `GET /guides` answers a JSON
array of Guide IDs, and each Guide carries storage internals.
"""

from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
import respx

from app.adapters.inbound.http.dependencies import get_list_guides_use_case
from app.composition import create_use_cases
from app.main import app
from app.settings import Settings
from tests import upstream_fixtures as fx

SECOND_ID = "34c790dd-123b-499b-ba55-ea2f5befb452"
LIST_URL = f"{fx.GUIDE_SERVICE}/guides"


def guide_url(guide_id: str) -> str:
    return f"{fx.GUIDE_SERVICE}/guides/{guide_id}"


def second_guide() -> dict[str, object]:
    return fx.guide() | {
        "id": SECOND_ID,
        "title": "Matcha in Ari",
        "shortDescription": "Green tea spots",
        "tags": ["matcha", "Ari"],
        "items": [fx.ITEM_IDS[0]],
    }


@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        router.get(LIST_URL).respond(json=[fx.GUIDE_ID, SECOND_ID])
        router.get(guide_url(fx.GUIDE_ID)).respond(json=fx.guide())
        router.get(guide_url(SECOND_ID)).respond(json=second_guide())
        yield router


@pytest_asyncio.fixture
async def gateway(upstream: respx.MockRouter) -> AsyncIterator[httpx.AsyncClient]:
    settings = Settings(
        guide_service_url=fx.GUIDE_SERVICE,  # pyrefly: ignore[bad-argument-type]
        restaurant_service_url=fx.RESTAURANT_SERVICE,  # pyrefly: ignore[bad-argument-type]
        upstream_timeout_seconds=1,
    )
    async with httpx.AsyncClient() as upstream_client:
        use_cases = create_use_cases(settings, upstream_client)
        app.dependency_overrides[get_list_guides_use_case] = lambda: (
            use_cases.list_guides
        )
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://gateway.test"
        ) as client:
            yield client
        app.dependency_overrides.clear()


async def test_lists_a_summary_of_every_guide_without_storage_internals(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get("/guides")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert [item["id"] for item in body["items"]] == [fx.GUIDE_ID, SECOND_ID]
    assert [item["itemCount"] for item in body["items"]] == [len(fx.ITEM_IDS), 1]
    assert body["items"][0]["coverPhoto"]["smallUrl"].endswith("20240902_091058.jpg")
    for internal in ("_id", "__v", "createdAt", "socialTitle", 'description"'):
        assert internal not in response.text


async def test_q_and_tag_filter_without_calling_guide_items_or_restaurants(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    response = await gateway.get("/guides", params={"q": "คาเฟ่", "tag": "กาแฟ"})

    assert [item["id"] for item in response.json()["items"]] == [fx.GUIDE_ID]
    assert {call.request.url.path for call in upstream.calls} == {
        "/guides",
        f"/guides/{fx.GUIDE_ID}",
        f"/guides/{SECOND_ID}",
    }


@pytest.mark.parametrize(
    ("url", "upstream_response", "status_code"),
    [
        (LIST_URL, httpx.ReadTimeout("slow"), 504),
        (LIST_URL, httpx.Response(500), 502),
        (LIST_URL, httpx.Response(200, content=b"null"), 502),
        (guide_url(SECOND_ID), httpx.ReadTimeout("slow"), 504),
        (guide_url(SECOND_ID), httpx.Response(503), 502),
        (guide_url(SECOND_ID), httpx.Response(200, json={"id": SECOND_ID}), 502),
        # A Guide the list names but upstream lacks fails the list; it isn't a 404.
        (guide_url(SECOND_ID), httpx.Response(200, content=b"null"), 502),
    ],
)
async def test_upstream_failures_fail_the_request_with_a_safe_body(
    gateway: httpx.AsyncClient,
    upstream: respx.MockRouter,
    url: str,
    upstream_response: Exception | httpx.Response,
    status_code: int,
) -> None:
    upstream.get(url).mock(side_effect=[upstream_response])

    response = await gateway.get("/guides")

    assert response.status_code == status_code
    assert list(response.json()) == ["detail"]
    assert fx.GUIDE_SERVICE not in response.text


async def test_q_over_100_characters_is_422_without_calling_upstream(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    response = await gateway.get("/guides", params={"q": "a" * 101})

    assert response.status_code == 422
    assert not upstream.calls
