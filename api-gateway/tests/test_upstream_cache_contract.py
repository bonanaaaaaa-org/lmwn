"""Caching through the whole gateway: HTTP in, respx counting upstream calls, and
an injected clock instead of sleeps.
"""

from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
import respx

from app.adapters.inbound.http.dependencies import (
    get_guide_detail_use_case,
    get_list_guides_use_case,
)
from app.composition import create_use_cases
from app.main import app
from app.settings import Settings
from tests import upstream_fixtures as fx
from tests.fakes import FakeClock

LIST_URL = f"{fx.GUIDE_SERVICE}/guides"
GUIDE_URL = f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}"


def item_url(n: int) -> str:
    return f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[n]}"


def restaurant_url(n: int) -> str:
    return f"{fx.RESTAURANT_SERVICE}/restaurants/{fx.RESTAURANT_IDS[n]}"


@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        router.get(LIST_URL).respond(json=[fx.GUIDE_ID])
        router.get(GUIDE_URL).respond(json=fx.guide())
        for n in range(len(fx.ITEM_IDS)):
            router.get(item_url(n)).respond(json=fx.guide_item(n))
            router.get(restaurant_url(n)).respond(json=fx.restaurant(n))
        yield router


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest_asyncio.fixture
async def gateway(
    upstream: respx.MockRouter, clock: FakeClock
) -> AsyncIterator[httpx.AsyncClient]:
    settings = Settings(
        guide_service_url=fx.GUIDE_SERVICE,  # pyrefly: ignore[bad-argument-type]
        restaurant_service_url=fx.RESTAURANT_SERVICE,  # pyrefly: ignore[bad-argument-type]
        upstream_timeout_seconds=1,
    )
    async with httpx.AsyncClient() as upstream_client:
        use_cases = create_use_cases(settings, upstream_client, clock=clock)
        app.dependency_overrides[get_guide_detail_use_case] = lambda: (
            use_cases.get_guide_detail
        )
        app.dependency_overrides[get_list_guides_use_case] = lambda: (
            use_cases.list_guides
        )
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://gateway.test"
        ) as client:
            yield client
        app.dependency_overrides.clear()


def upstream_calls(upstream: respx.MockRouter) -> int:
    return sum(route.call_count for route in upstream.routes)


async def test_repeat_requests_within_60_seconds_do_not_call_upstream_again(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter, clock: FakeClock
) -> None:
    first = await gateway.get(f"/guides/{fx.GUIDE_ID}")
    await gateway.get("/guides")
    calls_after_first_round = upstream_calls(upstream)

    clock.now += 59
    second = await gateway.get(f"/guides/{fx.GUIDE_ID}")
    listed = await gateway.get("/guides?q=One")

    assert first.status_code == second.status_code == listed.status_code == 200
    assert second.json() == first.json()
    # 1 Guide + every Guide Item and Restaurant, then just the ID list: the Guide
    # itself was already cached by the detail request.
    assert calls_after_first_round == 1 + 2 * len(fx.ITEM_IDS) + 1
    assert upstream_calls(upstream) == calls_after_first_round


async def test_requests_after_60_seconds_call_upstream_again(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter, clock: FakeClock
) -> None:
    await gateway.get(f"/guides/{fx.GUIDE_ID}")
    calls_per_request = upstream_calls(upstream)

    clock.now += 60
    await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert upstream_calls(upstream) == 2 * calls_per_request


async def test_a_failed_upstream_read_is_not_cached(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    route = upstream.get(restaurant_url(0))
    route.side_effect = [
        httpx.Response(503),
        httpx.Response(200, json=fx.restaurant(0)),
    ]

    degraded = await gateway.get(f"/guides/{fx.GUIDE_ID}")
    recovered = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert degraded.json()["items"][0]["restaurant"] is None
    assert "cache-control" not in degraded.headers
    assert recovered.json()["items"][0]["restaurant"]["id"] == fx.RESTAURANT_IDS[0]
    assert recovered.headers["cache-control"] == "public, max-age=60"
    assert route.call_count == 2


async def test_a_failed_guide_is_an_uncached_error_and_the_retry_succeeds(
    gateway: httpx.AsyncClient, upstream: respx.MockRouter
) -> None:
    route = upstream.get(GUIDE_URL)
    route.side_effect = [httpx.Response(500), httpx.Response(200, json=fx.guide())]

    failed = await gateway.get(f"/guides/{fx.GUIDE_ID}")
    retried = await gateway.get(f"/guides/{fx.GUIDE_ID}")

    assert failed.status_code == 502
    assert "cache-control" not in failed.headers
    assert retried.status_code == 200
    assert route.call_count == 2
