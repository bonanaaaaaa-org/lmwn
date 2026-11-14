from collections.abc import Iterator

import pytest
from httpx import AsyncClient

from app.adapters.inbound.http.dependencies import get_guide_detail_use_case
from app.application.errors import (
    GuideNotFound,
    InvalidSourceData,
    SourceTimeout,
    SourceUnavailable,
)
from app.application.get_guide_detail import create_get_guide_detail
from app.main import app
from tests.builders import a_guide, a_guide_item, a_restaurant
from tests.fakes import FakeGuideSource, FakeRestaurantSource

GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb"


@pytest.fixture
def guides() -> FakeGuideSource:
    return FakeGuideSource(
        guides={GUIDE_ID: a_guide(GUIDE_ID, ["item-a", "item-b"])},
        items={
            "item-a": a_guide_item("item-a", "restaurant-a"),
            "item-b": a_guide_item("item-b", "restaurant-b"),
        },
    )


@pytest.fixture
def restaurants() -> FakeRestaurantSource:
    return FakeRestaurantSource(
        restaurants={
            "restaurant-a": a_restaurant(
                "restaurant-a", branch="One Bangkok", line="@a"
            ),
            "restaurant-b": a_restaurant("restaurant-b"),
        }
    )


@pytest.fixture(autouse=True)
def use_fakes(
    guides: FakeGuideSource, restaurants: FakeRestaurantSource
) -> Iterator[None]:
    app.dependency_overrides[get_guide_detail_use_case] = lambda: (
        create_get_guide_detail(guide_source=guides, restaurant_source=restaurants)
    )
    yield
    app.dependency_overrides.clear()


async def test_returns_the_hydrated_guide_in_camel_case(client: AsyncClient) -> None:
    response = await client.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == GUIDE_ID
    assert body["socialTitle"].startswith("ไม่อยากจะเชื่อ")
    assert body["shortDescription"] == "รวมคาเฟ่เด็ดที่ One Bangkok"
    assert body["coverPhoto"]["smallUrl"].endswith("/cover.jpg")
    assert body["writeDate"] == "2024-03-10T12:00:00Z"
    assert body["timeZone"] == "Asia/Bangkok"
    assert [item["id"] for item in body["items"]] == ["item-a", "item-b"]
    first = body["items"][0]
    assert first["description"] == "write-up for item-a"
    assert next(p["largeUrl"] for p in first["photos"]).endswith("/item-a-1.jpg")
    assert first["restaurant"]["phoneNo"] == "0939164541"
    assert first["restaurant"]["numberOfReviews"] == 6


async def test_working_hours_cover_all_seven_days_in_minutes(
    client: AsyncClient,
) -> None:
    response = await client.get(f"/guides/{GUIDE_ID}")

    hours = response.json()["items"][0]["restaurant"]["workingHours"]
    assert [day["day"] for day in hours] == [1, 2, 3, 4, 5, 6, 7]
    assert hours[0]["ranges"] == [{"opensAt": 420, "closesAt": 1260}]
    assert hours[5]["ranges"] == []


async def test_absent_optional_details_are_left_out(client: AsyncClient) -> None:
    response = await client.get(f"/guides/{GUIDE_ID}")

    with_some, with_none = (item["restaurant"] for item in response.json()["items"])
    assert with_some["branch"] == "One Bangkok"
    assert with_some["line"] == "@a"
    assert {"instagram", "facebook"}.isdisjoint(with_some)
    assert {"branch", "line", "instagram", "facebook"}.isdisjoint(with_none)


async def test_a_failing_restaurant_is_returned_as_an_unavailable_restaurant(
    client: AsyncClient, restaurants: FakeRestaurantSource
) -> None:
    restaurants.failures["restaurant-b"] = SourceTimeout()

    response = await client.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == 200
    unavailable = response.json()["items"][1]
    assert unavailable["restaurant"] is None
    assert unavailable["description"] == "write-up for item-b"
    assert len(unavailable["photos"]) == 2


@pytest.mark.parametrize(
    "guide_id",
    [
        "not-a-uuid",
        "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfbX",
        "e1bfd2d3f0fb470ebdd3be884fdd8dfb",
        "..%2F..%2Fguides",
        "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb%3Fx%3D1",
        "%20e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb",
    ],
)
async def test_an_id_that_is_not_uuid_shaped_is_404_without_calling_upstream(
    client: AsyncClient, guides: FakeGuideSource, guide_id: str
) -> None:
    response = await client.get(f"/guides/{guide_id}")

    assert response.status_code == 404
    # `%2F` decodes to `/`, so that case misses the route and gets Starlette's 404.
    assert list(response.json()) == ["detail"]
    assert guides.in_flight.calls == []


async def test_a_malformed_id_gets_the_guide_not_found_detail(
    client: AsyncClient,
) -> None:
    response = await client.get("/guides/not-a-uuid")

    assert response.json() == {"detail": "Guide not found"}


@pytest.mark.parametrize(
    ("error", "status_code"),
    [
        (GuideNotFound("secret-id"), 404),
        (SourceTimeout("http://internal:8888/guides timed out"), 504),
        (SourceUnavailable("http://internal:8888/guides answered 500"), 502),
        (InvalidSourceData("field 'title' missing in {'_id': ...}"), 502),
    ],
)
async def test_guide_failures_map_to_safe_error_responses(
    client: AsyncClient, guides: FakeGuideSource, error: Exception, status_code: int
) -> None:
    guides.failures[GUIDE_ID] = error

    response = await client.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == status_code
    assert list(response.json()) == ["detail"]
    assert str(error) not in response.text
    assert "internal" not in response.text


async def test_a_failing_guide_item_fails_the_request(
    client: AsyncClient, guides: FakeGuideSource
) -> None:
    guides.failures["item-b"] = SourceUnavailable()

    response = await client.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == 502


async def test_the_endpoint_and_its_models_are_documented(client: AsyncClient) -> None:
    spec = (await client.get("/openapi.json")).json()

    operation = spec["paths"]["/guides/{guideId}"]["get"]
    assert {"200", "404", "502", "504"} <= set(operation["responses"])
    assert operation["parameters"][0]["name"] == "guideId"
    schemas = spec["components"]["schemas"]
    restaurant = schemas["RestaurantResponse"]["properties"]
    assert {
        "branch",
        "line",
        "instagram",
        "facebook",
        "workingHours",
        "phoneNo",
    } <= set(restaurant)
    assert {"branch", "line", "instagram", "facebook"}.isdisjoint(
        schemas["RestaurantResponse"]["required"]
    )
    assert "timeZone" in schemas["GuideDetailResponse"]["required"]
    assert "_id" not in str(schemas)
