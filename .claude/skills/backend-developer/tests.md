# Good and Bad Tests (hexagonal FastAPI gateway)

## Good Tests

Each layer is tested through its own public interface, with the doubles that layer allows.

```python
# GOOD (domain): pure rule, no doubles
def test_restaurant_is_open_within_todays_hours() -> None:
    hours = [WorkingHours(day=1, open=time(8), close=time(17))]

    assert is_open(hours, at=datetime(2026, 1, 5, 9, 0)) is True  # a Monday


# GOOD (use case): orchestration over in-memory fakes
async def test_guide_detail_keeps_guide_order() -> None:
    guides = FakeGuideSource(guides=[GUIDE], items=ITEMS)
    restaurants = FakeRestaurantSource(restaurants=RESTAURANTS, delays={"r1": 0.01})
    get_guide_detail = create_get_guide_detail(guide_source=guides, restaurant_source=restaurants)

    detail = await get_guide_detail(GUIDE.id)

    assert [i.restaurant.name for i in detail.items if i.restaurant] == ["ONIBUS COFFEE", "Matcha House"]


# GOOD (use case): partial-failure policy
async def test_one_unavailable_restaurant_does_not_fail_the_guide() -> None:
    restaurants = FakeRestaurantSource(restaurants=RESTAURANTS, failures={"r1": SourceTimeout()})
    get_guide_detail = create_get_guide_detail(
        guide_source=FakeGuideSource(guides=[GUIDE], items=ITEMS), restaurant_source=restaurants
    )

    detail = await get_guide_detail(GUIDE.id)

    assert detail.items[0].restaurant is None
    assert detail.items[1].restaurant is not None


# GOOD (outbound adapter): upstream contract → domain value / application error
async def test_guide_source_maps_upstream_404_to_guide_not_found(upstream: respx.MockRouter) -> None:
    upstream.get(f"{GUIDE_URL}/guides/{MISSING_ID}").respond(404)
    source = create_guide_source(httpx.AsyncClient(), GUIDE_URL)

    with pytest.raises(GuideNotFound):
        await source.get_guide(MISSING_ID)


async def test_guide_source_rejects_malformed_payload(upstream: respx.MockRouter) -> None:
    upstream.get(f"{GUIDE_URL}/guides/{GUIDE_ID}").respond(json={"id": GUIDE_ID})  # missing fields
    source = create_guide_source(httpx.AsyncClient(), GUIDE_URL)

    with pytest.raises(InvalidSourceData):
        await source.get_guide(GUIDE_ID)


# GOOD (inbound adapter): HTTP status, shape and mapping, with use cases over fakes
async def test_get_guide_returns_camel_case_detail(client_with_fakes: AsyncClient) -> None:
    response = await client_with_fakes.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == 200
    assert response.json()["items"][0]["restaurant"]["phoneNo"] == "0939164541"


async def test_source_timeout_becomes_504(client_with_failing_guides: AsyncClient) -> None:
    response = await client_with_failing_guides.get(f"/guides/{GUIDE_ID}")

    assert response.status_code == 504
    assert "localhost" not in response.text


async def test_malformed_guide_id_is_rejected(client: AsyncClient) -> None:
    response = await client.get("/guides/not-a-uuid")

    assert response.status_code == 404  # never reaches upstream
```

Characteristics:

- Each test sits at the lowest layer that can prove the behavior
- Fakes are real implementations of the port contract, not call recorders
- Survives internal refactors (splitting a use case, changing concurrency strategy)
- Describes WHAT the system does, not HOW

## Bad Tests

```python
# BAD: MagicMock of your own use case — proves nothing about orchestration
async def test_router_calls_use_case(client: AsyncClient) -> None:
    use_case = AsyncMock(return_value=FAKE_DETAIL)
    app.dependency_overrides[get_get_guide_detail] = lambda: use_case
    await client.get(f"/guides/{GUIDE_ID}")
    use_case.assert_awaited_once()


# BAD: asserts on internal call counts/order of a fake
async def test_fetches_each_restaurant_once() -> None:
    restaurants = FakeRestaurantSource(...)
    await create_get_guide_detail(guide_source=..., restaurant_source=restaurants)(GUIDE_ID)
    assert restaurants.calls == ["r1", "r2"]


# BAD: respx in a use-case test — couples core tests to the HTTP adapter
async def test_guide_detail(upstream: respx.MockRouter) -> None:
    upstream.get(...).respond(json=GUIDE_PAYLOAD)
    ...


# BAD: tests a dataclass definition, not behavior
def test_restaurant_has_name() -> None:
    assert "name" in Restaurant.__dataclass_fields__


# BAD: calls the real data server
async def test_real_guides() -> None:
    async with httpx.AsyncClient() as c:
        assert (await c.get("http://localhost:8888/guides")).status_code == 200
```

Red flags:

- `MagicMock`/`AsyncMock` standing in for your own use cases, ports or adapters
- respx anywhere outside `tests/adapters/outbound/` (and the QA contract suite)
- Asserting on call counts or order
- Testing type definitions without behavior
- Depending on the real data server or network
- Test name describes HOW not WHAT
