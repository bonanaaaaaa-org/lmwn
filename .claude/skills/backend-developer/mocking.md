# Test Doubles (hexagonal FastAPI gateway)

Double only at **ports and the network** — the edges of the hexagon. Everything inside runs for real.

## Which double, where

| Testing | Double | How |
|---|---|---|
| Domain | none | Call the functions/constructors directly |
| Use cases | **In-memory fakes** of the ports | `FakeGuideSource`, `FakeRestaurantSource` in `tests/fakes.py` |
| Inbound HTTP adapter | Use cases built over fakes | Override the `dependencies.py` providers via `app.dependency_overrides` |
| Outbound adapters | **respx** at the network | `upstream.get(f"{GUIDE_URL}/guides/{gid}").respond(json=...)` / `.mock(side_effect=httpx.ConnectTimeout(...))` |
| Settings | Real `Settings(...)` values | Pass explicitly, or `monkeypatch.setenv` |
| Time | Pass `now` into domain functions | No clock patching needed when the domain takes time as input |

## Don't double these (your own code)

| Don't double | Why |
|---|---|
| Use cases (with `MagicMock`) | Orchestration and partial-failure policy are the behavior under test |
| Domain functions | Pure — let them run |
| Pydantic validation | It is the adapter's job; test it through the adapter |
| Exception handlers | Let application errors flow through the real handlers |

## Writing fakes

A fake is a small, honest implementation of the port's **contract**, not a call recorder:

```python
class FakeGuideSource:
    """In-memory GuideSource. Honors the port contract: unknown ids raise GuideNotFound;
    configured failures raise the given application error."""

    def __init__(
        self,
        *,
        guides: Sequence[Guide] = (),
        items: Sequence[GuideItem] = (),
        failures: dict[str, Exception] | None = None,
    ) -> None:
        self._guides = {g.id: g for g in guides}
        self._items = {i.id: i for i in items}
        self._failures = failures or {}

    async def list_guide_ids(self) -> list[str]:
        return list(self._guides)

    async def get_guide(self, guide_id: str) -> Guide:
        if guide_id in self._failures:
            raise self._failures[guide_id]
        try:
            return self._guides[guide_id]
        except KeyError:
            raise GuideNotFound(guide_id) from None

    async def get_guide_item(self, item_id: str) -> GuideItem:
        ...
```

- Fakes live in `tests/fakes.py` (shared across layers), typed to satisfy the Protocol — pyrefly checks them
- If the fake and the real adapter could disagree on a contract point, add an outbound-adapter test pinning the real behavior
- A port without a fake (or other second adapter) shouldn't exist — call the code directly

## respx conventions (outbound adapters only)

```python
@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        yield router
```

- Shape fixtures like the real data (README examples, `:8888/ui`, `:9999/ui`)
- Cover per adapter method: success → domain value, 404 → `*NotFound`, timeout → `SourceTimeout`, connection error / 5xx → `SourceUnavailable`, malformed payload → `InvalidSourceData`
- Use `router.calls` only for boundary facts, never internal call order
