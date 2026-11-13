---
name: backend-developer
description: Backend development skill for the Guide to Hidden Gems API gateway. Provides the hexagonal architecture (domain, application use cases and ports, inbound/outbound adapters, composition root), conventions, and testing rules for api-gateway/ (FastAPI, Pydantic, httpx, uv, ruff, pyrefly, pytest). Use when implementing gateway endpoints or modifying the gateway.
---

Backend developer skill for the API gateway (`api-gateway/`).

Use this skill when implementing gateway features, creating API endpoints, adding ports or adapters, or modifying use cases. The gateway aggregates the provided data services — guides on `:8888` (`/guides`, `/guides/{id}`, `/guide-items/{id}`) and restaurants on `:9999` (`/restaurants/{id}`) — into responses shaped for the web app. Web work in `web/` belongs to `frontend-developer`.

---

## MANDATORY: Verification Before Completion

**Every task MUST end with a verification step.** Before reporting work as done, run ALL of the following from `api-gateway/` and fix any errors:

```bash
cd api-gateway
uv run ruff check                  # Lint — zero errors
uv run ruff format --check         # Format check — must be clean
uv run pyrefly check               # Type check — zero errors
uv run pytest tests/<paths covering your change>  # Scoped tests — all must pass
```

From the repo root, `pnpm lint`, `pnpm format:check`, `pnpm type-check` and `pnpm test` run the same checks across the workspace through Turborepo (`pnpm test` includes the coverage floor and the architecture test).

**Scope the test run while iterating**, then run the full suite once before reporting done. Finally hit the changed endpoints against the real data server under `pnpm dev` (repo root) and report the evidence.

**Do NOT skip this step.** The task is NOT complete until all checks pass.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (async) — inbound adapter only |
| Language | Python 3.13, type-annotated |
| Package manager | uv — root uv workspace (`pyproject.toml` + `uv.lock` at the repo root) |
| Validation | Pydantic v2 at the adapter seams (upstream payloads, HTTP responses), pydantic-settings for config |
| HTTP client | httpx `AsyncClient` (one pooled client, built in the composition root) — outbound adapters only |
| Server | uvicorn (`--reload` in dev, port 4000) |
| Testing | pytest, pytest-asyncio, pytest-cov, respx |
| Linting | Ruff (lint + format) |
| Type checking | Pyrefly |
| Task runner | `api-gateway/package.json` scripts, run by Turborepo |

---

## Architecture: Hexagonal (Ports and Adapters)

The gateway is a light hexagon: a framework-free core (domain + application) with a few ports where real variation exists, adapters grouped by direction and technology, and one composition root that wires them. Do not wrap every module in an interface — a port exists only where a second adapter exists or is scheduled (an in-memory fake for tests counts).

```
           inbound adapter                core                     outbound adapter
  HTTP ──▶ adapters/inbound/http ──▶ application use cases ──▶ ports ◀── adapters/outbound/data_server ──▶ :8888 / :9999
            (FastAPI, Pydantic)        (+ domain values)       (Protocols)      (httpx, Pydantic)
```

### Layers and dependency rule

| Layer | Path | May import | Must not import |
|---|---|---|---|
| **Domain** | `app/domain/` | standard library, other `app.domain` modules | anything third-party (FastAPI, httpx, Pydantic), `app.application`, `app.adapters` |
| **Application** | `app/application/` (use cases) and `app/application/ports/` (Protocols) | standard library, `app.domain`, `app.application` | anything third-party, `app.adapters`, `app.composition`, `app.settings` |
| **Inbound adapters** | `app/adapters/inbound/http/` | FastAPI, Pydantic, `app.application`, `app.domain` | outbound adapters, httpx |
| **Outbound adapters** | `app/adapters/outbound/data_server/` | httpx, Pydantic, `app.application.ports`, `app.application.errors`, `app.domain` | inbound adapters, FastAPI |
| **Composition root** | `app/composition.py` | everything | — |
| **Entry point** | `app/main.py` | everything | business logic |

Dependencies point inward. `tests/test_architecture.py` enforces the domain and application rows by parsing imports — it fails the build if a framework import leaks into the core. Keep it passing; extend it when you add a layer.

### Domain (`app/domain/`)

- Entities and value objects as **frozen dataclasses** (`@dataclass(frozen=True, slots=True)`): `Guide`, `GuideItem`, `Photo`, `Restaurant`, `WorkingHours`, ...
- Domain functions for real rules (e.g. whether a restaurant is open at a given time from its working hours, ordering of items). Pure: inputs in, values out, no clock or I/O — pass `now` in.
- Domain errors for invariant violations (`DomainError` subclasses), raised from constructors/factories.
- No Pydantic here: validation of *external* data happens in adapters, which then build domain values.

### Application (`app/application/`)

- **Ports** (`app/application/ports/<port>.py`): `typing.Protocol` classes the application owns and never implements. Each port's docstring states its **contract** — what it returns, what it raises, whether it may cache, ordering guarantees.

  ```python
  class GuideSource(Protocol):
      """Reads Guides and Guide Items from the guide service.

      Contract for implementations:
      - get_guide raises GuideNotFound when the guide does not exist.
      - Technical failures raise SourceUnavailable (connection/5xx), SourceTimeout,
        or InvalidSourceData (payload failed validation) — never raw httpx errors.
      - Returns domain values; callers treat them as immutable.
      """

      async def list_guide_ids(self) -> list[str]: ...
      async def get_guide(self, guide_id: str) -> Guide: ...
      async def get_guide_item(self, item_id: str) -> GuideItem: ...
  ```

- **Application errors** (`app/application/errors.py`): `GuideNotFound`, `RestaurantNotFound`, `SourceUnavailable`, `SourceTimeout`, `InvalidSourceData`. Outbound adapters raise them; the inbound adapter maps them to HTTP.
- **Use cases** (`app/application/<use_case>.py`): one module per use case, built by a factory that takes its ports as keyword arguments and returns a callable. The type alias documents behavior and errors.

  ```python
  type GetGuideDetail = Callable[[str], Awaitable[GuideDetail]]
  """Returns the Guide with each item's Restaurant, in guide order.

  A failing item or restaurant degrades to an unavailable entry instead of
  failing the guide. Raises GuideNotFound, or a Source* error when the guide
  itself cannot be read.
  """


  def create_get_guide_detail(
      *, guide_source: GuideSource, restaurant_source: RestaurantSource, max_concurrency: int = 8
  ) -> GetGuideDetail:
      async def get_guide_detail(guide_id: str) -> GuideDetail:
          ...
      return get_guide_detail
  ```

- Use cases own the orchestration: concurrent fan-out (`asyncio.gather` / `asyncio.TaskGroup` bounded by an `asyncio.Semaphore`), ordering, and the **partial-failure policy**. They keep no state between calls.

### Inbound adapter: HTTP (`app/adapters/inbound/http/`)

- `router_<resource>.py` per resource (`router_health.py`, `router_guides.py`), `schemas.py` for Pydantic response models, `errors.py` for exception handlers, `dependencies.py` for FastAPI `Depends` providers that hand routers their use cases.
- Routers are thin: validate input (typed path/query params — `UUID`, `Annotated[int, Query(ge=1)]`), call one use case, map the domain result to a response model. No orchestration, no httpx.
- Every route declares a `response_model`; response models use `ConfigDict(alias_generator=to_camel, populate_by_name=True)` so JSON is camelCase, and contain only fields the web app uses.
- Error mapping (in `errors.py`, registered by `main.py`):

  | Application error | HTTP response |
  |---|---|
  | `GuideNotFound` / `RestaurantNotFound` | 404 |
  | `SourceTimeout` | 504 |
  | `SourceUnavailable` | 503 |
  | `InvalidSourceData` | 502 |

  Error bodies are `{"detail": "<safe message>"}` — never upstream URLs, stack traces or exception text.

### Outbound adapter: data server (`app/adapters/outbound/data_server/`)

- One adapter per port: `guide_client.py` implements `GuideSource`, `restaurant_client.py` implements `RestaurantSource`. Construct them with a factory taking the shared `httpx.AsyncClient` and base URL: `create_guide_source(client, base_url) -> GuideSource`.
- `payloads.py` holds Pydantic models mirroring the upstream contract exactly as delivered (camelCase, optional `branch`/`line`/`instagram`/`facebook`, `rating` 0–5, `day` 1–7, `HH:MM` times). Validate with `Model.model_validate(response.json())`, then convert to domain values.
- Translate every failure into an application error: HTTP 404 → `*NotFound`; `httpx.TimeoutException` → `SourceTimeout`; other `httpx.TransportError` / 5xx → `SourceUnavailable`; `pydantic.ValidationError` → `InvalidSourceData`. Log the upstream status and id at WARNING, without response bodies.

### Composition root (`app/composition.py`) and entry point (`app/main.py`)

- `composition.py` is the only module that knows which adapter implements which port: settings + shared `httpx.AsyncClient` → outbound adapters → use cases (e.g. a `UseCases` dataclass).
- `main.py` builds the FastAPI app: lifespan creates the shared client and the use cases through `composition.py` and stores them on `app.state`; registers CORS (web origin, `GET` only), exception handlers and routers (feature routers under `prefix="/api"`, `/health` at the root).
- Tests swap the composition by overriding the `dependencies.py` providers with use cases built over in-memory fakes.

### Adding a feature

1. **Domain** — add or extend frozen dataclasses and pure functions in `app/domain/`.
2. **Port** — only if the use case needs a new external capability: a `Protocol` in `app/application/ports/` with its contract docstring, plus any new errors in `app/application/errors.py`.
3. **Use case** — `app/application/<use_case>.py` with a `create_<use_case>(*, ports...)` factory.
4. **Outbound adapter** — implement the port in `app/adapters/outbound/data_server/` (payload models + translation).
5. **Inbound adapter** — router, response schema and dependency provider in `app/adapters/inbound/http/`.
6. **Wire** — build the adapter and use case in `app/composition.py`; include the router in `app/main.py`.

Work through these as vertical TDD slices (below), not layer by layer.

---

## FORBIDDEN

- Third-party imports (FastAPI, httpx, Pydantic, ...) in `app/domain/` or `app/application/`
- Adapters importing each other, or the core importing adapters, `app.composition` or `app.settings`
- `Any` type annotations (`typing.Any` is a banned import; ANN401 enabled in Ruff) — use precise types, dataclasses, Protocols, Pydantic models at the seams
- Hardcoded upstream URLs, timeouts or secrets — read them from `app/settings.py` in the composition root
- Creating an `httpx.AsyncClient` per request — reuse the composition-root client
- Returning raw upstream JSON — every route declares a `response_model`
- Leaking upstream stack traces, internal URLs or exception text in error responses
- Ports with a single implementation and no scheduled second one (including the test fake) — call the code directly instead
- Skipping type annotations on public functions
- `--no-verify` on git hooks

---

## Project Structure

```
api-gateway/
├── app/
│   ├── main.py                       # Entry point: create_app(), lifespan, CORS, handlers, routers
│   ├── composition.py                # Composition root: settings → adapters → use cases
│   ├── settings.py                   # pydantic-settings: upstream URLs, timeout, CORS origins
│   ├── domain/                       # Framework-free values and rules
│   │   ├── guide.py                  # Guide, GuideItem, Photo
│   │   ├── restaurant.py             # Restaurant, WorkingHours, opening-hours rules
│   │   └── errors.py                 # DomainError
│   ├── application/
│   │   ├── errors.py                 # GuideNotFound, SourceUnavailable, SourceTimeout, InvalidSourceData
│   │   ├── list_guides.py            # create_list_guides(*, guide_source)
│   │   ├── get_guide_detail.py       # create_get_guide_detail(*, guide_source, restaurant_source)
│   │   └── ports/
│   │       ├── guide_source.py       # GuideSource Protocol
│   │       └── restaurant_source.py  # RestaurantSource Protocol
│   └── adapters/
│       ├── inbound/http/
│       │   ├── router_health.py      # GET /health
│       │   ├── router_guides.py      # GET /api/guides, GET /api/guides/{guide_id}
│       │   ├── schemas.py            # Pydantic response models
│       │   ├── errors.py             # Application error → HTTP mapping
│       │   └── dependencies.py       # Depends providers for use cases
│       └── outbound/data_server/
│           ├── payloads.py           # Pydantic models of upstream payloads
│           ├── guide_client.py       # GuideSource over httpx
│           └── restaurant_client.py  # RestaurantSource over httpx
├── tests/
│   ├── conftest.py                   # `client` fixture (httpx over ASGITransport)
│   ├── fakes.py                      # In-memory GuideSource / RestaurantSource
│   ├── test_architecture.py          # Layer import rules
│   ├── domain/                       # Pure domain tests
│   ├── application/                  # Use cases over in-memory fakes
│   └── adapters/
│       ├── inbound/                  # HTTP: status, shape, error mapping, validation
│       └── outbound/                 # data-server adapters against respx
├── pyproject.toml                    # deps, ruff, pyrefly, pytest, coverage
├── package.json                      # turbo entry: dev (uvicorn + data server), lint, type-check, test
└── turbo.json
```

Files listed beyond what exists today are where new code goes; create them as features need them.

---

## Pydantic Models (adapter seams only)

- **Upstream payloads** (`adapters/outbound/data_server/payloads.py`) mirror the data-server contract, including constraints: `rating: float = Field(ge=0, le=5)`, `day: int = Field(ge=1, le=7)`, `open: str = Field(pattern=r"^\d{2}:\d{2}$")`, optional fields as `str | None = None`.
- **HTTP responses** (`adapters/inbound/http/schemas.py`) are what the web app receives: camelCase via `alias_generator=to_camel`, only fields the UI uses. Build them from domain values with an explicit `from_domain(...)` classmethod rather than leaking domain types into FastAPI.

```python
class RestaurantResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    branch: str | None = None
    rating: float
    phone_no: str
    categories: list[str]

    @classmethod
    def from_domain(cls, restaurant: Restaurant) -> "RestaurantResponse":
        return cls(id=restaurant.id, name=restaurant.name, branch=restaurant.branch, ...)
```

---

## TDD Workflow (Red → Green → Refactor)

**Core principle**: Write one test, make it pass, repeat. Never write all tests first, then all implementation.

### Philosophy

Tests verify behavior through **public interfaces**, not implementation details. The hexagon gives each layer a natural interface:

| Interface | What you test through | Doubles |
|---|---|---|
| Domain | Function/constructor input → value or `DomainError` | none |
| Use cases | `create_x(ports=fakes)(input)` → result or application error | in-memory fakes of the ports |
| Inbound HTTP adapter | `client` requests → status + JSON body | use cases over fakes (dependency overrides) |
| Outbound adapters | Adapter method → domain value or application error | respx at the network |

**Bad tests** mock your own use cases or adapters with `MagicMock`, assert on internal call counts, or inspect private state. Warning sign: the test breaks on a refactor that didn't change behavior.

See [tests.md](tests.md) for good/bad examples and [mocking.md](mocking.md) for doubles.

### Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation** — and don't build the hexagon layer by layer (all domain, then all ports, then all adapters). Slice vertically: one behavior through every layer it needs.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

### The Loop

**1. Plan** — list the behaviors to test (e.g. "guide detail keeps guide order", "unknown guide is 404", "one failing restaurant degrades to unavailable"), prioritize critical paths and failure handling, decide which layer each behavior belongs to.

**2. Tracer bullet** — ONE test for ONE behavior, usually starting at the use case with fakes:

```
RED:   Write test → uv run pytest → fails
GREEN: Minimal code to pass → uv run pytest → passes
```

**3. Incremental loop** — next behavior, one test at a time. Only enough code to pass the current test.

**4. Refactor** — only when GREEN: extract duplication, deepen modules, simplify interfaces; run `uv run pytest` after each step.

### Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses the layer's public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features or ports added
```

---

## Testing

### Setup

- Runner: **pytest** + **pytest-asyncio** (`asyncio_mode = "auto"` — async tests need no decorator)
- HTTP: the `client` fixture in `tests/conftest.py` (httpx `AsyncClient` over `ASGITransport`)
- Fakes: in-memory port implementations in `tests/fakes.py`, seeded per test
- Upstream mocking: **respx**, only in `tests/adapters/outbound/`
- Coverage: **pytest-cov**, floor in `[tool.coverage.report] fail_under` (do not lower it without a comment explaining why)

### Commands

```bash
uv run pytest                          # Run all tests
uv run pytest tests/application        # One layer
uv run pytest -v                       # Verbose
uv run pytest --cov=app                # With coverage (what `pnpm test` runs)
```

### IMPORTANT: Always update endpoint tests

When modifying any endpoint (adding, changing, or removing behavior), update `tests/adapters/inbound/test_router_{resource}.py` — add tests for new behavior, update ones whose rules changed, remove ones asserting behavior that no longer exists — and run them before finishing.

### Test Pyramid — Your Layers

| Layer | Location | Volume | Covers |
|---|---|---|---|
| Domain | `tests/domain/` | most | value invariants, opening-hours rules, ordering |
| Use cases | `tests/application/` | many | orchestration, partial failure, error propagation — over fakes |
| Outbound adapters | `tests/adapters/outbound/` | per adapter | payload validation, 404/timeout/5xx/malformed → application errors (respx) |
| Inbound HTTP | `tests/adapters/inbound/` | per endpoint | status codes, camelCase shape, field stripping, 422 validation, error mapping |

`qa-engineer` owns the full in-process contract suite (HTTP in, respx out) and browser journeys; you own the layers above.

**Push-Down Rule:** if a contract or browser check catches a gateway bug that no layer test caught, add the lowest-layer test that would have.

**Coverage goal:** 100% of decision points + critical paths, NOT 100% line coverage for its own sake.

---

## Linting & Type Checking

### Ruff

```bash
uv run ruff check              # Lint
uv run ruff check --fix        # Auto-fix
uv run ruff format             # Format
uv run ruff format --check     # Check format without modifying
```

Config in `api-gateway/pyproject.toml`: extended rules `I`, `ANN401`, `E`, `TID` (banned `typing.Any`), `DTZ`, `B`, `UP`; `E501` ignored (formatter handles line length).

### Pyrefly

```bash
cd api-gateway && uv run pyrefly check
```

Config in `[tool.pyrefly]`: Python 3.13, `python-interpreter-path = "../.venv/bin/python3"` (the root uv workspace venv).

---

## Environment Variables

Read by `app/settings.py` (pydantic-settings; also loads `api-gateway/.env` if present), consumed only by the composition root and `main.py`:

```bash
GUIDE_SERVICE_URL=http://localhost:8888
RESTAURANT_SERVICE_URL=http://localhost:9999
UPSTREAM_TIMEOUT_SECONDS=5.0
CORS_ALLOWED_ORIGINS=["http://localhost:3000"]
```

---

## Local Development

```bash
uv sync                          # from the repo root (uv workspace)
pnpm dev                         # repo root: data server + gateway (:4000) + web (:3000)
pnpm --filter api-gateway dev    # gateway + data server only
```

- API docs at http://localhost:4000/docs
- The data server's Swagger UIs: http://localhost:8888/ui and http://localhost:9999/ui

---

## Checklist for New Feature

1. **Plan** — behaviors and the layer each belongs to; new port only if a new external capability is needed
2. **TDD loop per slice** — domain → use case (fakes) → outbound adapter (respx) → inbound adapter (client), one behavior at a time
3. **Wire** — `app/composition.py` and `app/main.py`
4. **Run verification (MANDATORY — do NOT skip)**:
    ```bash
    cd api-gateway
    uv run ruff check
    uv run ruff format --check
    uv run pyrefly check
    uv run pytest
    ```
    Then hit the endpoint against the real data server under `pnpm dev`. Fix all errors before reporting completion.
