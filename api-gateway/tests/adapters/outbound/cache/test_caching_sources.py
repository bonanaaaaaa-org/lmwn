"""The caching decorators over the real data-server adapters, with respx counting
upstream calls and an injected clock standing in for time.
"""

import httpx
import pytest
import respx

from app.adapters.outbound.cache.caching_sources import (
    cache_guide_source,
    cache_restaurant_source,
)
from app.adapters.outbound.data_server.guide_client import create_guide_source
from app.adapters.outbound.data_server.restaurant_client import (
    create_restaurant_source,
)
from app.application.errors import (
    GuideNotFound,
    RestaurantNotFound,
    SourceTimeout,
    SourceUnavailable,
)
from app.application.ports.guide_source import GuideSource
from app.application.ports.restaurant_source import RestaurantSource
from tests import upstream_fixtures as fx
from tests.fakes import FakeClock

TTL = 60
LIST_URL = f"{fx.GUIDE_SERVICE}/guides"
GUIDE_URL = f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}"
ITEM_URL = f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[0]}"
RESTAURANT_URL = f"{fx.RESTAURANT_SERVICE}/restaurants/{fx.RESTAURANT_IDS[0]}"


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def guides(http_client: httpx.AsyncClient, clock: FakeClock) -> GuideSource:
    return cache_guide_source(
        create_guide_source(http_client, fx.GUIDE_SERVICE),
        ttl_seconds=TTL,
        clock=clock,
    )


@pytest.fixture
def restaurants(http_client: httpx.AsyncClient, clock: FakeClock) -> RestaurantSource:
    return cache_restaurant_source(
        create_restaurant_source(http_client, fx.RESTAURANT_SERVICE),
        ttl_seconds=TTL,
        clock=clock,
    )


async def test_repeat_reads_within_the_ttl_call_upstream_once(
    upstream: respx.MockRouter,
    guides: GuideSource,
    restaurants: RestaurantSource,
    clock: FakeClock,
) -> None:
    routes = [
        upstream.get(LIST_URL).respond(json=[fx.GUIDE_ID]),
        upstream.get(GUIDE_URL).respond(json=fx.guide()),
        upstream.get(ITEM_URL).respond(json=fx.guide_item(0)),
        upstream.get(RESTAURANT_URL).respond(json=fx.restaurant(0)),
    ]

    for _ in range(2):
        assert await guides.list_guide_ids() == [fx.GUIDE_ID]
        assert (await guides.get_guide(fx.GUIDE_ID)).id == fx.GUIDE_ID
        assert (await guides.get_guide_item(fx.ITEM_IDS[0])).id == fx.ITEM_IDS[0]
        restaurant = await restaurants.get_restaurant(fx.RESTAURANT_IDS[0])
        assert restaurant.id == fx.RESTAURANT_IDS[0]
        clock.now += TTL - 1

    assert [route.call_count for route in routes] == [1, 1, 1, 1]


async def test_reads_go_upstream_again_once_the_ttl_has_passed(
    upstream: respx.MockRouter,
    guides: GuideSource,
    restaurants: RestaurantSource,
    clock: FakeClock,
) -> None:
    routes = [
        upstream.get(LIST_URL).respond(json=[fx.GUIDE_ID]),
        upstream.get(GUIDE_URL).respond(json=fx.guide()),
        upstream.get(ITEM_URL).respond(json=fx.guide_item(0)),
        upstream.get(RESTAURANT_URL).respond(json=fx.restaurant(0)),
    ]

    for _ in range(2):
        await guides.list_guide_ids()
        await guides.get_guide(fx.GUIDE_ID)
        await guides.get_guide_item(fx.ITEM_IDS[0])
        await restaurants.get_restaurant(fx.RESTAURANT_IDS[0])
        clock.now += TTL

    assert [route.call_count for route in routes] == [2, 2, 2, 2]


async def test_the_cached_guide_id_list_cannot_be_changed_by_a_caller(
    upstream: respx.MockRouter, guides: GuideSource
) -> None:
    upstream.get(LIST_URL).respond(json=[fx.GUIDE_ID])

    (await guides.list_guide_ids()).clear()

    assert await guides.list_guide_ids() == [fx.GUIDE_ID]


@pytest.mark.parametrize(
    ("failure", "error"),
    [
        (httpx.Response(503), SourceUnavailable),
        (httpx.ConnectTimeout("slow"), SourceTimeout),
        (httpx.Response(200, content=b"null"), GuideNotFound),
    ],
)
async def test_a_failed_guide_read_is_not_cached(
    upstream: respx.MockRouter,
    guides: GuideSource,
    failure: httpx.Response | Exception,
    error: type[Exception],
) -> None:
    route = upstream.get(GUIDE_URL)
    route.side_effect = [failure, httpx.Response(200, json=fx.guide())]

    with pytest.raises(error):
        await guides.get_guide(fx.GUIDE_ID)
    guide = await guides.get_guide(fx.GUIDE_ID)

    assert guide.id == fx.GUIDE_ID
    assert route.call_count == 2


async def test_a_failed_guide_list_is_not_cached(
    upstream: respx.MockRouter, guides: GuideSource
) -> None:
    route = upstream.get(LIST_URL)
    route.side_effect = [httpx.Response(500), httpx.Response(200, json=[fx.GUIDE_ID])]

    with pytest.raises(SourceUnavailable):
        await guides.list_guide_ids()

    assert await guides.list_guide_ids() == [fx.GUIDE_ID]
    assert route.call_count == 2


async def test_a_failed_restaurant_read_is_not_cached(
    upstream: respx.MockRouter, restaurants: RestaurantSource
) -> None:
    route = upstream.get(RESTAURANT_URL)
    route.side_effect = [
        httpx.Response(404),
        httpx.Response(200, json=fx.restaurant(0)),
    ]

    with pytest.raises(RestaurantNotFound):
        await restaurants.get_restaurant(fx.RESTAURANT_IDS[0])
    restaurant = await restaurants.get_restaurant(fx.RESTAURANT_IDS[0])

    assert restaurant.id == fx.RESTAURANT_IDS[0]
    assert route.call_count == 2
