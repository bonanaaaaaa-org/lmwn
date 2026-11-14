import httpx
import pytest
import respx

from app.adapters.outbound.data_server.restaurant_client import create_restaurant_source
from app.application.errors import (
    InvalidSourceData,
    RestaurantNotFound,
    SourceTimeout,
    SourceUnavailable,
)
from app.domain.working_hours import OpeningRange
from tests import upstream_fixtures as fx


@pytest.fixture
def source(http_client: httpx.AsyncClient):
    return create_restaurant_source(http_client, fx.RESTAURANT_SERVICE)


def url(n: int) -> str:
    return f"{fx.RESTAURANT_SERVICE}/restaurants/{fx.RESTAURANT_IDS[n]}"


async def test_returns_a_restaurant_with_every_optional_detail(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(url(0)).respond(json=fx.restaurant(0))

    restaurant = await source.get_restaurant(fx.RESTAURANT_IDS[0])

    assert restaurant.name == "ONIBUS COFFEE"
    assert restaurant.branch == "One Bangkok"
    assert (restaurant.rating, restaurant.number_of_reviews) == (4.3, 6)
    assert restaurant.categories == ("ร้านกาแฟ/ชา", "เบเกอรี/เค้ก")
    assert (restaurant.line, restaurant.instagram, restaurant.facebook) == (
        "@onibuscoffee",
        "onibuscoffee_bkk",
        "onibuscoffeebkk",
    )
    assert restaurant.working_hours.on(1) == (OpeningRange(480, 1080),)


async def test_an_unrated_restaurant_keeps_rating_zero_with_zero_reviews(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(url(1)).respond(json=fx.restaurant(1))

    restaurant = await source.get_restaurant(fx.RESTAURANT_IDS[1])

    assert (restaurant.rating, restaurant.number_of_reviews) == (0, 0)
    assert (restaurant.line, restaurant.facebook) == (None, None)


async def test_absent_optional_details_stay_none_and_hours_are_normalised(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(url(2)).respond(json=fx.restaurant(2))

    restaurant = await source.get_restaurant(fx.RESTAURANT_IDS[2])

    assert (
        restaurant.branch,
        restaurant.line,
        restaurant.instagram,
        restaurant.facebook,
    ) == (
        None,
        None,
        None,
        None,
    )
    assert [ranges for _, ranges in restaurant.working_hours.week()] == [
        (OpeningRange(1020, 1440),),
        (OpeningRange(1020, 1440),),
        (OpeningRange(1020, 1440),),
        (OpeningRange(1020, 1440),),
        (OpeningRange(1080, 1560),),
        (),
        (),
    ]


@pytest.mark.parametrize(
    "response", [httpx.Response(200, content=b"null"), httpx.Response(404)]
)
async def test_unknown_restaurant_raises_restaurant_not_found(
    upstream: respx.MockRouter, source, response: httpx.Response
) -> None:
    upstream.get(url(0)).mock(return_value=response)

    with pytest.raises(RestaurantNotFound):
        await source.get_restaurant(fx.RESTAURANT_IDS[0])


def _with(n: int, **changes: object) -> dict[str, object]:
    return fx.restaurant(n) | changes


def _with_first_hours(**changes: object) -> dict[str, object]:
    payload = fx.restaurant(0)
    hours = payload["workingHours"]
    assert isinstance(hours, list)
    hours[0] = hours[0] | changes
    return payload


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param(_with_first_hours(open="8:00"), id="time not HH:MM"),
        pytest.param(_with_first_hours(open="24:00"), id="24:00 as opening time"),
        pytest.param(_with_first_hours(close="๑๘:๐๐"), id="Thai digits"),
        pytest.param(_with_first_hours(day=0), id="day 0"),
        pytest.param(_with_first_hours(day=8), id="day 8"),
        pytest.param(_with_first_hours(day=True), id="boolean day"),
        pytest.param(_with_first_hours(day=1.0), id="float day"),
        pytest.param(_with(0, rating=5.1), id="rating above 5"),
        pytest.param(_with(0, numberOfReviews=-1), id="negative reviews"),
        pytest.param(_with(0, name=None), id="null name"),
    ],
)
async def test_malformed_restaurants_raise_invalid_source_data(
    upstream: respx.MockRouter, source, payload: dict[str, object]
) -> None:
    upstream.get(url(0)).respond(json=payload)

    with pytest.raises(InvalidSourceData):
        await source.get_restaurant(fx.RESTAURANT_IDS[0])


@pytest.mark.parametrize(
    ("side_effect", "error"),
    [
        (httpx.ReadTimeout("slow"), SourceTimeout),
        (httpx.RemoteProtocolError("bad"), SourceUnavailable),
        (httpx.Response(502), SourceUnavailable),
    ],
)
async def test_transport_failures_become_application_errors(
    upstream: respx.MockRouter,
    source,
    side_effect: Exception | httpx.Response,
    error: type[Exception],
) -> None:
    upstream.get(url(0)).mock(side_effect=[side_effect])

    with pytest.raises(error):
        await source.get_restaurant(fx.RESTAURANT_IDS[0])
