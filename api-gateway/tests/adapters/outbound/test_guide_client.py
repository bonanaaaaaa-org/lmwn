from datetime import UTC, datetime

import httpx
import pytest
import respx

from app.adapters.outbound.data_server.guide_client import create_guide_source
from app.application.errors import (
    GuideItemNotFound,
    GuideNotFound,
    InvalidSourceData,
    SourceTimeout,
    SourceUnavailable,
)
from app.domain.guide import Photo
from tests import upstream_fixtures as fx


@pytest.fixture
def source(http_client: httpx.AsyncClient):
    return create_guide_source(http_client, fx.GUIDE_SERVICE + "/")


async def test_get_guide_returns_the_guide_without_storage_internals(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").respond(json=fx.guide())

    guide = await source.get_guide(fx.GUIDE_ID)

    assert guide.id == fx.GUIDE_ID
    assert guide.title == "10 คาเฟ่ลับ One Bangkok!"
    assert guide.tags == ("กาแฟ", "คาเฟ่", "กรุงเทพ", "One", "Bangkok")
    assert guide.item_ids == fx.ITEM_IDS
    assert guide.write_date == datetime(2024, 3, 10, 12, tzinfo=UTC)
    assert guide.cover_photo == Photo(
        id="63ce2123-b49a-49cc-bc13-80ed802a7894",
        small_url="http://localhost:7777/r/854/480/20240902_091058.jpg",
        large_url="http://localhost:7777/r/1920/1080/20240902_091058.jpg",
    )


async def test_get_guide_item_returns_its_write_up_restaurant_and_photos(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[0]}").respond(
        json=fx.guide_item(0)
    )

    item = await source.get_guide_item(fx.ITEM_IDS[0])

    assert item.id == fx.ITEM_IDS[0]
    assert item.restaurant_id == fx.RESTAURANT_IDS[0]
    assert [photo.small_url for photo in item.photos] == [
        "http://localhost:7777/r/480/854/20250205_121420.jpg",
        "http://localhost:7777/r/480/854/20250205_121425.jpg",
    ]


@pytest.mark.parametrize(
    "response", [httpx.Response(200, content=b"null"), httpx.Response(404)]
)
async def test_unknown_guide_raises_guide_not_found(
    upstream: respx.MockRouter, source, response: httpx.Response
) -> None:
    upstream.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").mock(return_value=response)

    with pytest.raises(GuideNotFound):
        await source.get_guide(fx.GUIDE_ID)


async def test_unknown_guide_item_raises_guide_item_not_found(
    upstream: respx.MockRouter, source
) -> None:
    upstream.get(f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[0]}").respond(
        content=b"null"
    )

    with pytest.raises(GuideItemNotFound):
        await source.get_guide_item(fx.ITEM_IDS[0])


@pytest.mark.parametrize(
    ("side_effect", "error"),
    [
        (httpx.ReadTimeout("slow"), SourceTimeout),
        (httpx.ConnectTimeout("slow"), SourceTimeout),
        (httpx.ConnectError("refused"), SourceUnavailable),
        (httpx.Response(500), SourceUnavailable),
        (httpx.Response(503), SourceUnavailable),
        (httpx.Response(400), SourceUnavailable),
        (httpx.Response(200, text="<html>oops</html>"), InvalidSourceData),
        (httpx.Response(200, json=["not", "a", "guide"]), InvalidSourceData),
        (httpx.Response(200, json={"id": fx.GUIDE_ID}), InvalidSourceData),
    ],
)
async def test_failures_become_application_errors(
    upstream: respx.MockRouter,
    source,
    side_effect: Exception | httpx.Response,
    error: type[Exception],
) -> None:
    upstream.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").mock(
        side_effect=[side_effect]
    )

    with pytest.raises(error):
        await source.get_guide(fx.GUIDE_ID)


async def test_a_guide_with_a_naive_write_date_is_invalid(
    upstream: respx.MockRouter, source
) -> None:
    payload = fx.guide() | {"writeDate": "2024-03-10T12:00:00"}
    upstream.get(f"{fx.GUIDE_SERVICE}/guides/{fx.GUIDE_ID}").respond(json=payload)

    with pytest.raises(InvalidSourceData):
        await source.get_guide(fx.GUIDE_ID)


async def test_invalid_guide_item_raises_invalid_source_data(
    upstream: respx.MockRouter, source
) -> None:
    payload = fx.guide_item(0) | {"photos": "none"}
    upstream.get(f"{fx.GUIDE_SERVICE}/guide-items/{fx.ITEM_IDS[0]}").respond(
        json=payload
    )

    with pytest.raises(InvalidSourceData):
        await source.get_guide_item(fx.ITEM_IDS[0])


async def test_ids_are_url_encoded_so_they_cannot_change_the_path(
    upstream: respx.MockRouter, source
) -> None:
    route = upstream.get(
        f"{fx.GUIDE_SERVICE}/guide-items/..%2Fguides%3Fx%3D1%23y"
    ).respond(json=fx.guide_item(0))

    await source.get_guide_item("../guides?x=1#y")

    assert route.called
    assert (
        route.calls.last.request.url.raw_path == b"/guide-items/..%2Fguides%3Fx%3D1%23y"
    )
