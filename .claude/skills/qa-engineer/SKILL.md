---
name: qa-engineer
description: QA engineering skill for the Guide to Hidden Gems app. Provides conventions, patterns, and rules for writing API contract tests for the gateway (pytest + httpx + respx), Playwright E2E tests, managing data-testid attributes, and checking test coverage across api-gateway/, web/ and e2e/.
---

The gateway has no auth or database, so its contract is status codes, response shape, validation and upstream-failure mapping.

Use this skill when writing **API contract tests** for the gateway, E2E tests, adding `data-testid` attributes to components, reviewing test coverage, or creating test plans from the assignment's requirements. This role owns both layers of integration testing: API (gateway contract) and E2E (user journey).

---

## MANDATORY: Verification Before Completion

**Every task MUST end with a verification step.** Before reporting work as done, run the checks for every area you touched and fix any errors.

If adding or updating **API tests** in `api-gateway/tests/`:

```bash
cd api-gateway
uv run ruff check tests/
uv run ruff format --check tests/
uv run pytest tests/contract/<files covering your change>
```

If adding or updating **E2E tests** in `e2e/` (see *E2E setup* below — the package is created with the first spec):

```bash
cd e2e
pnpm lint                                   # oxlint
pnpm exec tsc --noEmit
pnpm test:e2e <spec paths covering your change>   # starts or reuses `pnpm dev` from the repo root
```

**Scope the E2E run to the specs you touched**; run the full suite only for cross-cutting changes (shared fixtures, Playwright config).

If adding `data-testid` attributes to components in `web/`:

```bash
cd web
pnpm lint:js
pnpm gen:css-types && pnpm type-check
pnpm exec vitest run <paths covering your change>
```

**Do NOT skip this step.** Return PASS, FAIL, or BLOCKED with the commands you ran, their results, and the tested revision. Missing checks are not passes.

---

## Test Pyramid — Your Layers (API Contract + E2E)

You own the top two layers of the test pyramid. Your mandate is to **keep E2E tests lean** and **push assertions down** to API or unit layers whenever possible.

**Layer 2 — API contract tests (pytest, `api-gateway/tests/contract/`)**

This is where most of your test volume should be. API tests are fast, deterministic, and pin the contract between the web app and the gateway.

For each endpoint, cover:
1. Golden-path response (200) with full shape assertion (camelCase keys, no leaked upstream-only fields)
2. Validation failure (422) — malformed ids or query params, with no upstream call made
3. Upstream not found → 404
4. Upstream timeout / connection error → 504 / 503, and malformed upstream payload → 502, with no internals in the error body
5. Partial failure — one guide item or restaurant failing degrades that item instead of failing the guide
6. Edge cases — empty guide (no items), optional fields absent (`branch`, `line`, `instagram`, `facebook`), boundary ratings (0, 5), missing working-hours days

**Layer 3 — E2E tests (Playwright, `e2e/specs/`)**

Write the fewest tests here. Reserve E2E for:

| E2E is the right layer | E2E is the wrong layer |
|---|---|
| Critical user journey (open a guide → find a restaurant → contact / share) | Gateway validation and error mapping (API test) |
| Multi-page navigation, back/forward, deep links | Single-component behavior (Vitest) |
| Browser-specific behavior (Web Share fallback, lazy images, responsive layout) | Response schema shape (API test) |
| Visual state after a complex interaction sequence | Error message text (component test) |

**Push-Down Rule (MANDATORY):**

When an E2E test catches a bug:
1. Ask: could a unit test or API test have caught this?
2. If yes, write the lower-level test FIRST (or route it to the implementing developer — see below)
3. Then decide: does the E2E test still add unique value (browser behavior, multi-page flow)?
4. If not, remove the E2E assertion — the lower-level test is cheaper to maintain

**Anti-patterns to avoid:**
- Ice cream cone: more E2E specs than API test files
- Duplicating API response shape assertions in both Playwright and pytest
- E2E tests for gateway validation rules
- E2E tests of a single component in isolation

**Coverage goal:** 100% of decision points + critical paths, NOT 100% line coverage. Prefer more API tests over more E2E tests for the same coverage.

---

## API Testing (owned by this role)

API tests cover the gateway contract — response shape, validation, error envelope, upstream-failure mapping, edge cases. They run the FastAPI app in-process with the data services mocked at the network (respx). No browser, no real data server.

### When to write an API test vs an E2E test

| Scenario | Layer |
|---|---|
| New endpoint → verify response shape, 4xx/5xx paths | **API test** |
| User journey across pages or UI state | **E2E test** |
| Edge case with many input permutations | **API test** (cheap, fast) |
| Responsive layout, interaction state | **E2E test** |

Rule of thumb: an endpoint without an API test is untested, even if an E2E covers it indirectly.

### API test location

```
api-gateway/tests/
├── conftest.py              # Shared fixtures: `client` (httpx over ASGITransport)
├── contract/                # QA-owned: one file per endpoint, real composition, respx at the network
│   └── test_guides.py
├── domain/, application/    # Developer-owned layer tests (fakes, no network)
└── adapters/                # Developer-owned adapter tests
```

Contract tests run the **whole hexagon** in-process — real inbound adapter, use cases, outbound adapters and composition — with only the data server replaced by respx. That is what distinguishes them from the developer's layer tests, which swap ports for in-memory fakes.

### API test conventions

- Use the `client` fixture (async `httpx.AsyncClient` over `ASGITransport`); `asyncio_mode = "auto"`, so async tests need no decorator
- Mock the guide (`:8888`) and restaurant (`:9999`) services with respx — never hit the network or the real data server
- Use upstream fixtures shaped like the real data (the README examples and the data server's Swagger at `:8888/ui`, `:9999/ui`)
- Assert on the full response shape, not just the status code — schema drift is the #1 integration bug
- Test naming: `test_<action>_<scenario>` (e.g. `test_get_guide_returns_404_for_unknown_guide`)
- Arrange / Act / Assert structure — blank lines between the three

### Example

```python
async def test_get_guide_rejects_malformed_id(client: AsyncClient, upstream: respx.MockRouter) -> None:
    response = await client.get("/api/guides/not-a-uuid")

    assert response.status_code == 422
    assert not upstream.calls  # rejected before any upstream call


async def test_get_guide_maps_upstream_timeout_to_504(client: AsyncClient, upstream: respx.MockRouter) -> None:
    upstream.get(f"{GUIDE_URL}/guides/{GUIDE_ID}").mock(side_effect=httpx.ReadTimeout("timeout"))

    response = await client.get(f"/api/guides/{GUIDE_ID}")

    assert response.status_code == 504
    assert "localhost:8888" not in response.text


async def test_get_guide_returns_guide_with_restaurants(client: AsyncClient, upstream: respx.MockRouter) -> None:
    mock_full_guide(upstream)

    response = await client.get(f"/api/guides/{GUIDE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert set(body) >= {"id", "title", "description", "tags", "coverPhoto", "items"}
    assert body["items"][0]["restaurant"]["phoneNo"] == "0939164541"
```

### Working with `backend-developer`

- `backend-developer` implements the endpoint + writes unit tests and a smoke test per endpoint
- `qa-engineer` (this role) writes the comprehensive contract suite covering every failure mode and edge case
- When the gateway contract changes, update the API tests **before** UI work depends on it — the contract is the seam between roles
- Missing or failing **unit** coverage is routed back to the implementing developer, not absorbed by QA

---

## Tech Stack

| Layer | Technology |
|---|---|
| API tests | pytest, pytest-asyncio, httpx `ASGITransport`, respx (in `api-gateway/`) |
| E2E framework | Playwright (in `e2e/`, added with the first spec) |
| Language | TypeScript (strict) for E2E; Python 3.13 for API tests |
| Unit testing | Vitest + Testing Library (in `web/`, developer-owned) |
| Browser | Chromium, desktop + mobile (Pixel / iPhone device descriptors) projects |

---

## E2E setup

There is no auth, so there are no login fixtures. Create the package with the first spec:

```
e2e/
├── specs/                    # All E2E specs
│   └── guide.spec.ts
├── playwright.config.ts
├── package.json              # name "e2e"; scripts: test:e2e, test:e2e:ui, lint (oxlint)
├── tsconfig.json
└── .oxlintrc.json            # extend/copy web's rules
```

Add `e2e` to `pnpm-workspace.yaml` and give it a `test:e2e` task in its `turbo.json` (uncached) — keep it out of the root `test` task so `pnpm test` stays fast.

### Playwright configuration

| Setting | Value |
|---|---|
| `testDir` | `./specs` |
| `baseURL` | `PLAYWRIGHT_BASE_URL` env or `http://localhost:3000` |
| `projects` | `chromium-desktop`, `chromium-mobile` (portrait phone device descriptor) |
| `trace` | Retain on failure |
| `screenshot` | Only on failure |
| `retries` | 2 in CI, 0 locally |
| `webServer` | `pnpm dev` from the repo root (data server + gateway + web), `reuseExistingServer: !process.env.CI`, waits on `http://localhost:3000` |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | Web base URL |
| `API_BASE_URL` | `http://localhost:4000` | Gateway URL (for direct API checks from specs) |
| `CI` | — | Enables CI-specific settings |

---

## data-testid Convention

### Naming Pattern

```
{feature}/{component}/{sub-element}
```

- **Kebab-case** throughout: `restaurant-card`, not `restaurantCard`
- **Slash-separated** hierarchy: `guide/restaurant-list/item[0]`
- Typically **2-3 levels** deep — avoid going deeper than 4
- **Dynamic items** use bracket index: `guide/restaurant-list/item[0]`

### Examples

| Test ID | What it targets |
|---|---|
| `guide` | Root container of the guide page |
| `guide/header` | Title, tags and cover |
| `guide/restaurant-list` | The restaurant list container |
| `guide/restaurant-list/item[0]` | First restaurant card |
| `guide/restaurant-list/empty-state` | No restaurants match the filters |
| `guide/error-state` | Guide failed to load |
| `guide/restaurant-list/item[0]/unavailable` | A restaurant that failed upstream |

### The `tid()` Utility

Build every `data-testid` with a **`tid()` helper** in `web/src/lib/testId.ts` (create it with the first test id, with a unit test):

```typescript
export function tid(...segments: (string | undefined)[]): string | undefined {
  const joined = segments.filter(Boolean).join("/");
  return joined || undefined;
}

tid("guide", "restaurant-list")  // "guide/restaurant-list"
tid(undefined, "header")         // "header"
tid(undefined, undefined)        // undefined (attribute omitted)
```

### Component Props Pattern

Components accept an optional `testId` prop and pass it down via `tid()`:

```tsx
interface RestaurantCardProps {
  restaurant: Restaurant;
  testId?: string;
}

export function RestaurantCard({ restaurant, testId }: RestaurantCardProps) {
  const id = tid(testId, "restaurant-card");
  return (
    <article data-testid={id}>
      <h3>{restaurant.name}</h3>
      <a href={`tel:${restaurant.phoneNo}`} data-testid={tid(id, "phone")}>{restaurant.phoneNo}</a>
    </article>
  );
}
```

### Rules for Adding data-testid

1. **Every page root container** MUST have a testId (e.g., `guide`, `guides`)
2. **Every interactive element** that E2E tests target SHOULD have a testId
3. **Empty, error and partial-failure states** MUST have testIds for assertion
4. **Dialog/lightbox containers** MUST have testIds
5. **List containers and list items** SHOULD have testIds (items use bracket index)
6. **Skeleton/loading states** SHOULD have testIds (e.g., `guide/restaurant-list/skeleton`)
7. **Do NOT add testIds to purely decorative elements** (icons, dividers, spacers)
8. **Always use `tid()`** — never hardcode a `data-testid` string directly

### Selector Priority in Tests

In both Playwright and Vitest, prefer:

1. `getByRole()` — buttons, links, headings (best for accessibility)
2. `getByLabel()` — form inputs with labels
3. `getByText()` — visible text content
4. `getByTestId()` — when no semantic selector is available

Use `data-testid` as a **stable anchor** when semantic selectors are fragile, not as the default choice.

---

## E2E Test Conventions

### Test File Pattern

```typescript
import { test, expect } from "@playwright/test";

test.describe("Guide - Detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /one bangkok/i }).click();
    await expect(page).toHaveURL(/\/guides\//);
  });

  test("shows the guide header and its restaurants", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("guide/restaurant-list")).toBeVisible();
  });

  test("filters restaurants by category", async ({ page }) => {
    await page.getByRole("button", { name: /cafe/i }).click();
    await expect(page.getByTestId("guide/restaurant-list/item[0]")).toBeVisible();
  });
});
```

### Naming

- Test file: `{feature-name}.spec.ts` in `e2e/specs/`
- `describe` block: `{Feature} - {Description}` pattern (e.g. `"Guide - Detail"`)
- `test` name: describes observable behavior, not implementation
- Use regex with `/i` flag for case-insensitive text matching

### Navigation

- Start from `/` and navigate through the UI; deep-link only when testing deep links themselves
- Use `toHaveURL()` to confirm navigation before asserting content
- Don't hardcode guide ids unless the spec is about a specific seeded guide — the data server seeds fixed data, so the guide list is stable

### Assertions

- Prefer `toBeVisible()` — E2E tests verify what the user sees
- Use `toHaveURL()` for navigation, `toHaveText()` / `toContainText()` for text, `toHaveAttribute("href", /^tel:/)` for contact links
- Set explicit timeouts only for genuinely slow operations: `{ timeout: 15000 }`

### Failure-state journeys

Exercise error and loading states with `page.route()` to delay or fail gateway requests (e.g. `route.fulfill({ status: 503 })`) rather than stopping services mid-suite.

---

## Commands

```bash
cd e2e && pnpm test:e2e                          # Run all E2E tests headless
cd e2e && pnpm test:e2e:ui                       # Interactive UI (debugging)
cd e2e && pnpm exec playwright test specs/guide.spec.ts
cd e2e && pnpm exec playwright test --grep "filters restaurants"
cd e2e && pnpm exec playwright show-report
```

---

## Workflow: Writing Tests from a Requirement

1. **Read the requirement** — the assignment README (Guide Detail + Guide Restaurant fields, the three user stories) and any spec/issue
2. **Pin the contract first** — write or update the gateway API tests for every field and failure mode the UI relies on
3. **Inventory existing testIds** — grep `data-testid` / `tid(` in the feature's components
4. **Add missing testIds** in `web/` using `tid()` and the naming convention
5. **Write the spec** in `e2e/specs/{feature}.spec.ts`, organized with nested `describe` blocks per page section
6. **Cover these categories**:
   - Page renders (root container visible) with every required field
   - Loading and empty states
   - Navigation (entry, exit, back/forward, deep link)
   - Interactions (search, filter, share, photo viewer)
   - Error and partial-failure states
   - Desktop and portrait-phone projects; keyboard-only path for the main journey
7. **Run verification** (see top of this document)

---

## Test Screenshots

Capture screenshots at key interaction points as acceptance evidence:

```
test-screenshots/{feature}/{issue-or-scenario}/{NN}-{description}.png
```

- `test-screenshots/` lives at the **repo root** and is git-ignored (add it to `.gitignore` with the first screenshot)
- Organize by issue number when one exists, else a descriptive folder (`guide-detail`, `kanchanaburi-trip`)
- Capture at minimum: initial state, filtered/searched state, empty result, error state, phone layout

```typescript
await page.screenshot({ path: screenshot("guide-detail", "01-initial"), fullPage: true });
```

---

## Test Organization

- `describe` blocks by feature using `{Feature} - {Description}`
- Tests are independent — the data server is read-only, so no serial mode or unique-name tricks are needed
- Use `.first()` / `.nth()` when asserting on lists

---

## Checklist for New E2E Test

- [ ] `describe` block uses `{Feature} - {Description}`
- [ ] `beforeEach` navigates to the page under test through the UI
- [ ] Prefer `getByRole` > `getByLabel` > `getByText` > `getByTestId`
- [ ] Assertions use `toBeVisible()`; navigation uses `toHaveURL()` with regex
- [ ] Missing `data-testid` attributes added via `tid()`
- [ ] Covers render, empty, interactions, error/partial-failure states
- [ ] Runs on both desktop and mobile projects
- [ ] Screenshots captured into `test-screenshots/{feature}/...`
- [ ] Lower-level (API/unit) coverage exists for anything the E2E asserts that could be tested lower
- [ ] Passes `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test:e2e` in `e2e/`
