"""GET /guides/{guideId} through the whole gateway: HTTP in, respx at the network.

Covers each gateway-contract row with payloads shaped like the real data server's.
"""

import asyncio
from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
import respx

from app.adapters.inbound.http.dependencies import get_guide_detail_use_case
from app.composition import create_use_cases
from app.main import app
from app.settings import Settings
from tests import upstream_fixtures as fx

GUIDE_URL = f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}"


def item_url(n: int) -> str:
    return f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[n]}"


def restaurant_url(n: int) -> str:
    return f"{fx.RESTAURANT_SERVICE}/restaurants/{fx.RESTAURANT_IDS[n]}"


@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        router.get(GUIDE_URL).respond(json=fx.guide())
        for n in range(len(fx.ITEM_IDS)):
            router.get(item_url(n)).respond(json=fx.guide_item(n))
            router.get(restaurant_url(n)).respond(json=fx.restaurant(n))
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
        app.dependency_overrides[get_guide_detail_use_case] = lambda: (
            use_cases.get_guide_detail
        )
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://gateway.test"
        ) as client:
            yield client
        app.dependency_overrides.clear()


async def test_returns_every_guide_item_and_its_restaurant_in_guide_order(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "10 คาเฟ่ลับ One Bangkok!"
    assert body["timeZone"] == "Asia/Bangkok"
    assert [item["id"] for item in body["items"]] == list(fx.ITEM_IDS)
    assert [item["restaurant"]["id"] for item in body["items"]] == list(
        fx.RESTAURANT_IDS
    )


async def test_storage_internals_and_absent_optional_fields_are_left_out(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert "_id" not in response.text
    assert "__v" not in response.text
    assert "createdAt" not in response.text
    rated, unrated, bare = (item["restaurant"] for item in response.json()["items"])
    assert {"branch", "line", "instagram", "facebook"} <= set(rated)
    assert unrated["instagram"] == "onibuscoffee_bkk"
    assert {"line", "facebook"}.isdisjoint(unrated)
    assert {"branch", "line", "instagram", "facebook"}.isdisjoint(bare)


async def test_an_unrated_restaurant_keeps_rating_zero_with_zero_reviews(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    unrated = response.json()["items"][1]["restaurant"]
    assert (unrated["rating"], unrated["numberOfReviews"]) == (0, 0)


async def test_working_hours_are_normalised_with_overnight_ranges(
    gateway: httpx.AsyncClient,
) -> None:
    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    hours = response.json()["items"][2]["restaurant"]["workingHours"]
    assert hours == [
        {"day": 1, "ranges": [{"opensAt": 1020, "closesAt": 1440}]},
        {"day": 2, "ranges": [{"opensAt": 1020, "closesAt": 1440}]},
        {"day": 3, "ranges": [{"opensAt": 1020, "closesAt": 1440}]},
        {"day": 4, "ranges": [{"opensAt": 1020, "closesAt": 1440}]},
        {"day": 5, "ranges": [{"opensAt": 1080, "closesAt": 1560}]},
        {"day": 6, "ranges": []},
        {"day": 7, "ranges": []},
    ]


async def test_a_malformed_guide_id_is_404_without_calling_upstream(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    response = await gateway.get("/guides/not-a-uuid")

    assert response.status_code == 404
    assert response.json() == {"detail": "Guide not found"}
    assert upstream.calls.call_count == 0


async def test_ids_from_upstream_are_url_encoded(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    guide = fx.guide() | {"items": ["../restaurants/x?y#z"]}
    upstream.get(GUIDE_URL).respond(json=guide)
    item = fx.guide_item(0) | {
        "id": "../restaurants/x?y#z",
        "restaurantId": "../../admin",
    }
    encoded_item = upstream.get(
        f"{fx.GUIDE_SERVICE}/guide-items/..%2Frestaurants%2Fx%3Fy%23z"
    ).respond(json=item)
    encoded_restaurant = upstream.get(
        f"{fx.RESTAURANT_SERVICE}/restaurants/..%2F..%2Fadmin"
    ).respond(json=fx.restaurant(0))

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 200
    assert encoded_item.called and encoded_restaurant.called


async def test_an_unknown_guide_is_404(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    upstream.get(GUIDE_URL).respond(content=b"null")

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Guide not found"}


@pytest.mark.parametrize(
    ("failure", "status_code"),
    [
        (httpx.ReadTimeout("slow"), 504),
        (httpx.Response(500, text="Traceback at http://guides.test/internal"), 502),
        (httpx.ConnectError("refused"), 502),
        (httpx.Response(200, json={"_id": "x", "title": 1}), 502),
    ],
)
@pytest.mark.parametrize("failing", ["guide", "guide item"])
async def test_a_failing_guide_or_guide_item_fails_the_request_safely(
    gateway: httpx.AsyncClient,
    upstream: respx.MockRouter,
    failing: str,
    failure: Exception | httpx.Response,
    status_code: int,
) -> None:
    url = GUIDE_URL if failing == "guide" else item_url(1)
    upstream.get(url).mock(side_effect=[failure])

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == status_code
    assert list(response.json()) == ["detail"]
    for leak in ("guides.test", "restaurants.test", "Traceback", "_id", "title"):
        assert leak not in response.text


async def test_a_guide_item_the_source_does_not_have_fails_the_request_with_502(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    upstream.get(item_url(1)).respond(content=b"null")

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 502


def _malformed_hours() -> dict[str, object]:
    payload = fx.restaurant(1)
    payload["workingHours"] = [
        {"day": 1, "open": "25:00", "close": "18:00", "_id": "x"}
    ]
    return payload


@pytest.mark.parametrize(
    "failure",
    [
        pytest.param(httpx.Response(200, content=b"null"), id="null"),
        pytest.param(httpx.ReadTimeout("slow"), id="timeout"),
        pytest.param(httpx.Response(503), id="5xx"),
        pytest.param(httpx.Response(200, json={"id": "x"}), id="invalid body"),
        pytest.param(
            httpx.Response(200, json=_malformed_hours()), id="malformed hours"
        ),
    ],
)
async def test_a_failing_restaurant_becomes_an_unavailable_restaurant(
    gateway: httpx.AsyncClient,
    upstream: respx.MockRouter,
    failure: Exception | httpx.Response,
) -> None:
    upstream.get(restaurant_url(1)).mock(side_effect=[failure])

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == list(fx.ITEM_IDS)
    assert items[1]["restaurant"] is None
    assert items[1]["description"] == fx.guide_item(1)["description"]
    assert items[1]["photos"]
    assert items[0]["restaurant"] is not None
    assert items[2]["restaurant"] is not None


async def test_upstream_fan_out_never_exceeds_eight_concurrent_requests(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    item_ids = [f"00000000-0000-0000-0000-{n:012d}" for n in range(30)]
    upstream.get(GUIDE_URL).respond(json=fx.guide() | {"items": item_ids})
    in_flight, peak = 0, 0

    async def slowly(request: httpx.Request) -> httpx.Response:
        nonlocal in_flight, peak
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.005)
        in_flight -= 1
        item_id = request.url.path.rsplit("/", 1)[-1]
        if "/guide-items/" in request.url.path:
            # A distinct Restaurant per item, so no fixture route answers it instantly.
            return httpx.Response(
                200,
                json=fx.guide_item(0) | {"id": item_id, "restaurantId": f"r-{item_id}"},
            )
        return httpx.Response(200, json=fx.restaurant(0))

    upstream.get(url__regex=rf"{fx.GUIDE_SERVICE}/guide-items/.+").mock(
        side_effect=slowly
    )
    upstream.get(url__regex=rf"{fx.RESTAURANT_SERVICE}/restaurants/.+").mock(
        side_effect=slowly
    )

    response = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == item_ids
    assert upstream.calls.call_count == 1 + 30 + 30
    assert peak == 8
