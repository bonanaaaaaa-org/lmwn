import pytest

from app.application.errors import (
    GuideItemNotFound,
    GuideNotFound,
    InvalidSourceData,
    RestaurantNotFound,
    SourceTimeout,
    SourceUnavailable,
)
from app.application.get_guide_detail import create_get_guide_detail
from tests.builders import a_guide, a_guide_item, a_restaurant
from tests.fakes import FakeGuideSource, FakeRestaurantSource, InFlight

GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb"


def seeded(
    item_count: int, *, delay: float = 0
) -> tuple[FakeGuideSource, FakeRestaurantSource]:
    in_flight = InFlight()
    item_ids = [f"item-{n}" for n in range(item_count)]
    guides = FakeGuideSource(
        guides={GUIDE_ID: a_guide(GUIDE_ID, item_ids)},
        items={i: a_guide_item(i, f"restaurant-{i}") for i in item_ids},
        in_flight=in_flight,
        delay=delay,
    )
    restaurants = FakeRestaurantSource(
        restaurants={
            f"restaurant-{i}": a_restaurant(f"restaurant-{i}") for i in item_ids
        },
        in_flight=in_flight,
        delay=delay,
    )
    return guides, restaurants


async def test_returns_every_guide_item_with_its_restaurant_in_guide_order() -> None:
    guides, restaurants = seeded(5)
    # The first items answer last; the order must still follow the Guide.
    guides.delays = {f"item-{n}": 0.002 * (5 - n) for n in range(5)}
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    detail = await get_guide_detail(GUIDE_ID)

    assert detail.guide.id == GUIDE_ID
    assert [entry.item.id for entry in detail.items] == [f"item-{n}" for n in range(5)]
    assert [
        entry.restaurant.id if entry.restaurant else None for entry in detail.items
    ] == [f"restaurant-item-{n}" for n in range(5)]


async def test_a_guide_with_no_items_returns_an_empty_list() -> None:
    guides, restaurants = seeded(0)
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    detail = await get_guide_detail(GUIDE_ID)

    assert detail.items == ()
    assert restaurants.in_flight.calls == [f"guide:{GUIDE_ID}"]


async def test_unknown_guide_raises_guide_not_found() -> None:
    guides, restaurants = seeded(1)
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    with pytest.raises(GuideNotFound):
        await get_guide_detail("00000000-0000-0000-0000-000000000000")


@pytest.mark.parametrize(
    "error", [SourceTimeout(), SourceUnavailable(), InvalidSourceData()]
)
async def test_a_failing_guide_fails_the_request(error: Exception) -> None:
    guides, restaurants = seeded(1)
    guides.failures[GUIDE_ID] = error
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    with pytest.raises(type(error)):
        await get_guide_detail(GUIDE_ID)


@pytest.mark.parametrize(
    "error", [SourceTimeout(), SourceUnavailable(), InvalidSourceData()]
)
async def test_a_failing_guide_item_fails_the_request(error: Exception) -> None:
    guides, restaurants = seeded(3)
    guides.failures["item-1"] = error
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    with pytest.raises(type(error)):
        await get_guide_detail(GUIDE_ID)


async def test_a_missing_guide_item_is_invalid_source_data_not_a_missing_guide() -> (
    None
):
    guides, restaurants = seeded(2)
    del guides.items["item-1"]
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    with pytest.raises(InvalidSourceData) as raised:
        await get_guide_detail(GUIDE_ID)

    assert isinstance(raised.value.__cause__, GuideItemNotFound)


@pytest.mark.parametrize(
    "error",
    [RestaurantNotFound(), SourceTimeout(), SourceUnavailable(), InvalidSourceData()],
)
async def test_a_failing_restaurant_becomes_an_unavailable_restaurant(
    error: Exception,
) -> None:
    guides, restaurants = seeded(3)
    restaurants.failures["restaurant-item-1"] = error
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    detail = await get_guide_detail(GUIDE_ID)

    assert [entry.item.id for entry in detail.items] == ["item-0", "item-1", "item-2"]
    assert detail.items[0].restaurant is not None
    assert detail.items[1].restaurant is None
    assert detail.items[2].restaurant is not None


async def test_upstream_fan_out_never_exceeds_the_concurrency_bound() -> None:
    guides, restaurants = seeded(20, delay=0.005)
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants
    )

    detail = await get_guide_detail(GUIDE_ID)

    assert len(detail.items) == 20
    assert guides.in_flight.peak == 8
    assert len(guides.in_flight.calls) == 1 + 20 + 20


async def test_the_concurrency_bound_is_configurable() -> None:
    guides, restaurants = seeded(6, delay=0.005)
    get_guide_detail = create_get_guide_detail(
        guide_source=guides, restaurant_source=restaurants, max_concurrency=2
    )

    await get_guide_detail(GUIDE_ID)

    assert guides.in_flight.peak == 2
