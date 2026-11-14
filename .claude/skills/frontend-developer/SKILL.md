---
name: frontend-developer
description: Web development skill for the Guide to Hidden Gems app. Provides conventions, patterns, and rules for building React components, features, pages, and tests in web/. Use when implementing web features, creating React components, writing web tests, or modifying styles.
---

Use this skill when implementing web features, creating React components, writing tests, or modifying styles in `web/`. Gateway work in `api-gateway/` belongs to `backend-developer`.

---

## MANDATORY: Verification Before Completion

**Every task MUST end with a verification step.** Before reporting work as done, run ALL of the following and fix any errors:

```bash
cd web
pnpm lint:js                                   # oxlint — zero errors
pnpm lint:css                                  # Stylelint — zero errors
pnpm format:check                              # oxfmt — run `pnpm format` to fix
pnpm gen:css-types && pnpm type-check          # CSS module types + react-router typegen + tsc --noEmit
pnpm exec vitest run <paths covering your change>  # Scoped unit tests — all must pass
pnpm build-storybook                           # Stories compile (also run in CI)
```

From the repo root, `pnpm lint`, `pnpm type-check` and `pnpm test` run the same checks across the workspace through Turborepo (turbo runs `gen:css-types` before `type-check` for you).

**Scope the test run while iterating.** Pass vitest the test files/directories that cover the code you touched (the tests you wrote or changed, plus existing tests for the components/hooks you edited). Run the full suite once before reporting done.

Then verify the changed journey in a real browser under `pnpm dev` (from the repo root — it starts the data server, the gateway and the web app) at a desktop size and a portrait phone size. Report browser evidence or clearly state why it was unavailable.

**Do NOT skip this step.** The task is NOT complete until all checks pass.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, React Router 8 (file-based routing, SPA mode — `ssr: false`) |
| Language | TypeScript 7 (strict mode + `noUncheckedIndexedAccess`, `any` FORBIDDEN) |
| Build | Vite 8 (native tsconfig path resolution: `resolve.tsconfigPaths`) |
| UI primitives | React Aria Components / React Aria hooks (accessible interactions, focus, keyboard, overlays) |
| Styling | CSS Modules (`.module.css`), CSS custom properties (design tokens), `modern-normalize` |
| Server state | TanStack Query v5 — `QueryClient` from `@/lib/queryClient`, provided by `@/lib/Providers` in `app/root.tsx`; devtools in dev only |
| Runtime validation | Zod 4 — gateway responses are parsed by `fetchJson` in `@/lib/apiClient` |
| Testing | Vitest, Testing Library (React + user-event), jsdom, msw |
| Linting & formatting | oxlint (`web/.oxlintrc.json`), Stylelint (stylelint-config-standard + local plugins), oxfmt (`web/.oxfmtrc.json`) |
| Component dev | Storybook 10 (`@storybook/react-vite`), docs + a11y addons |
| Class merging | `clsx` |
| Monorepo | pnpm workspace + Turborepo |

## FORBIDDEN

- Redux, Zustand, MobX, Jotai, or any external state manager
- String concatenation for classnames — use `clsx`
- Hand-rolled interactive widgets (custom buttons, menus, dialogs, listboxes, tabs, toggles) — use React Aria Components or React Aria hooks
- A new component without a `.stories.tsx` file
- `z-index` and `!important` in CSS — Stylelint rejects them (and rejects disabling the rule)
- `any` type in TypeScript
- Relative parent imports (`../`) and explicit `/index` imports — oxlint rejects them; use `@/`
- Calling the data services (`:8888`, `:9999`) directly — the web app talks only to the API gateway
- Loading scripts or styles from a CDN at runtime
- `--no-verify` on git hooks

---

## Project Structure

```
web/
├── app/
│   ├── root.tsx            # App shell, global CSS, layout
│   ├── root.module.css     # Framework file — exempt from the class-naming rule
│   ├── routes.ts           # File-based routing via flatRoutes() (tests excluded)
│   └── routes/             # Route modules (flat file convention)
│       ├── _index.tsx
│       └── guides.$guideId.tsx
├── src/
│   ├── components/         # Shared, reusable components
│   │   └── common/         # Generic UI (ErrorState, Skeleton, Rating, Tag, ...)
│   ├── features/           # Feature-scoped modules
│   │   └── guides/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/        # types.ts, queryKeys.ts, guidesApi.ts
│   │       └── pages/
│   ├── hooks/              # Shared hooks
│   ├── lib/                # App-wide: env.ts, apiClient.ts (fetchJson, ApiError), queryClient.ts, Providers.tsx
│   ├── test-utils/         # server.ts (shared msw server), queryClient.tsx (createTestQueryClient, renderWithQueryClient)
│   └── styles/
│       └── globals.css     # Layers + design tokens
├── .storybook/             # main.ts (stories glob, addons), preview.ts (global CSS, viewports, a11y)
├── stylelint-plugins/      # enforce-rem-unit, enforce-component-class-pattern
├── .oxlintrc.json
├── stylelint.config.mjs
├── vitest.config.ts
├── vitest.setup.tsx
└── vite.config.ts
```

### Path alias

Use `@/` to import from `src/`. Configured in `tsconfig.json`:
```json
{ "paths": { "@/*": ["./src/*"] } }
```

Import folder mates as `./x`; everything else through `@/`.

---

## Component Conventions

### File structure per component

Every component directory follows this pattern:

```
ComponentName/
├── ComponentName.tsx          # Component implementation
├── ComponentName.module.css   # CSS Module styles
├── ComponentName.stories.tsx  # Storybook stories (REQUIRED)
├── ComponentName.test.tsx     # Unit tests
└── index.ts                   # Barrel export (import the directory: "@/components/common/Rating")
```

### Component patterns

- **Named exports** (not default): `export function RestaurantCard(...)` — route modules are the only default exports
- **Props interface**: `export interface RestaurantCardProps { ... }`
- Styling via **data attributes** for variants: `data-variant`, `data-size`, `data-state`
- CSS targets data attributes: `&[data-variant="primary"] { ... }`
- Use `clsx` for conditional/merged classnames
- Accept `className` prop for composition
- Static content uses semantic elements (`<a>`, `<ul>`, `<h2>`, `<figure>`, `<article>`)
- Anything interactive is built on **React Aria Components** (`Button`, `Link`, `ToggleButton`, `TagGroup`, `SearchField`, `Dialog`/`Modal`, `Menu`, ...) or, for custom markup, React Aria hooks (`useButton`, `useFocusRing`, ...). They handle keyboard, focus, press/hover and screen-reader semantics consistently across mouse, touch and keyboard
- Style React Aria state through the data attributes it renders (`[data-hovered]`, `[data-pressed]`, `[data-focus-visible]`, `[data-selected]`, `[data-disabled]`) instead of `:hover`/`:focus`

### Test IDs

Each component owns its test ID and passes it down to its children, so IDs are paths of any depth: `guide/restaurant-card/photo-strip/next`.

- A page puts its name on its root (`data-testid="guide"`) and passes it to its components as `parentTestId`. Pages: `guide-index`, `guide`, `unknown` (catch-all 404). The shell around every page is `app`
- A component takes `parentTestId?: string`, builds its own ID with `joinTestId(parentTestId, "restaurant-card")` from `@/lib/testIds`, puts it on its root element as `data-testid`, and passes it to child components as their `parentTestId`. Without a parent the ID is just its own segment
- An interactive element inside a component appends its name: `` `${testId}/share` ``
- Atoms (`Button`, `ButtonLink`, `TagLink`) take the finished string as `testId` and add no segment
- Segments are kebab-case. Never write a full ID inline in a component; tests and Playwright use the literal string
- Repeated components share an ID; pick one by order (`.nth()`, `getAllByTestId(...)[i]`) or by text
- State is never part of an ID. Expose it through ARIA (`aria-pressed`, `aria-expanded`, `aria-current`) or `data-state` / `data-highlighted`
- In tests, query by role and name first. Use test IDs to scope to a component or to pick one of many repeats
- The "data-testid catalog" artboard on the design canvas lists the IDs for every screen

### Example components

Static:

```tsx
import clsx from "clsx";
import styles from "./Tag.module.css";

export interface TagProps {
  variant?: "default" | "selected";
  className?: string;
  children: React.ReactNode;
}

export function Tag({ variant = "default", className, children }: TagProps) {
  return (
    <span className={clsx(styles.Tag__Root, className)} data-variant={variant}>
      {children}
    </span>
  );
}
```

Interactive, on React Aria Components:

```tsx
import clsx from "clsx";
import { ToggleButton, type ToggleButtonProps } from "react-aria-components";
import styles from "./FilterChip.module.css";

export interface FilterChipProps extends Omit<ToggleButtonProps, "className"> {
  className?: string;
}

export function FilterChip({ className, ...props }: FilterChipProps) {
  return <ToggleButton {...props} className={clsx(styles.FilterChip__Root, className)} />;
}
```

```css
@layer components {
  .FilterChip__Root {
    border: 1px solid var(--color-border);

    &[data-selected] { background: var(--color-text); color: var(--color-surface); }
    &[data-focus-visible] { outline: 0.125rem solid var(--color-text); outline-offset: 0.125rem; }
  }
}
```

---

## CSS Conventions

### CSS Modules

- File: `ComponentName.module.css`, wrapped in `@layer components { ... }`
- Class names follow `{ComponentName}__{ElementName}` in PascalCase (`.Tag__Root`, `.RestaurantCard__Title`) — Stylelint enforces it, derived from the file name
- Scoped class naming at build: `generateScopedName: "[local]__[hash:base64:5]"`
- Use **CSS custom properties** (design tokens) from `globals.css`
- CSS nesting with `&` is fine (modern CSS)
- Run `pnpm gen:css-types` after adding/renaming classes so `tsc` sees them

### Layers and tokens (globals.css)

`globals.css` declares `@layer reset, base, components;` and defines tokens as custom properties on `:root` in `base`. Add new tokens there (kebab-case, e.g. `--color-text-muted`, `--space-200`, `--radius-100`) rather than hard-coding values in components.

### Styling rules

- **z-index is FORBIDDEN** — use DOM order for stacking
- **`!important` is FORBIDDEN** — fix specificity or structure instead
- Use `rem` for all units (except `1px` borders)
- Variant styling via data attributes, NOT extra CSS classes
- Font family is set once on `:root` — do not redeclare it in component CSS
- Reset: `modern-normalize`
- Honour `prefers-reduced-motion` for any transition or animation

### Images

- Use `smallUrl`/`largeUrl` from the gateway as `srcSet` + `sizes`, with meaningful `alt`
- `loading="lazy"` below the fold; reserve space (`aspect-ratio` or width/height) to avoid layout shift

---

## Feature Module Conventions

Features live in `src/features/{featureName}/` with this structure:

```
features/{featureName}/
├── components/          # Feature-scoped UI components
├── hooks/               # Feature-scoped React hooks
├── pages/               # Page components rendered by route modules
└── lib/
    ├── types.ts         # TypeScript types / Zod schemas for gateway responses
    ├── queryKeys.ts     # TanStack Query key factory
    └── {feature}Api.ts  # API client functions
```

### Query key factory pattern

```ts
export const guideKeys = {
  all: ["guides"] as const,
  lists: () => [...guideKeys.all, "list"] as const,
  details: () => [...guideKeys.all, "detail"] as const,
  detail: (id: string) => [...guideKeys.details(), id] as const,
};
```

### Data fetching hooks

- **Queries**: `useQuery` with typed return `useQuery<T, Error>({ ... })`
- Always pass `queryKey` from the key factory, not inline arrays
- Use `enabled` to conditionally skip queries
- **Derive loading/error states from TanStack Query** (`query.isPending`, `query.isError`) — never track them in a manual `useReducer` phase string; manual flags desync from the real query state

### API client pattern

- Base URL: `env.apiBaseUrl` from `@/lib/env` (`VITE_API_BASE_URL`, default `http://localhost:4000`) — never read `import.meta.env` elsewhere
- Every request goes through `fetchJson(path, schema, init?)` from `@/lib/apiClient`: it prefixes the base URL, asks for JSON, throws `ApiError` (`status`, `detail` from the gateway's `{"detail": ...}`) for non-2xx, and throws `InvalidResponseError` (with Zod `issues`) when a 2xx body doesn't match the schema
- Each feature's `lib/{feature}Api.ts` pairs a Zod schema from `lib/types.ts` with `fetchJson`, and derives its TypeScript types with `z.infer` — never hand-write a type that a schema already describes:

  ```ts
  // lib/types.ts
  export const guideSchema = z.object({ id: z.string(), title: z.string(), tags: z.array(z.string()) });
  export type Guide = z.infer<typeof guideSchema>;

  // lib/guidesApi.ts
  export const guidesApi = {
    get: (id: string, signal?: AbortSignal) => fetchJson(`/api/guides/${id}`, guideSchema, { signal }),
  };

  // hooks/useGuide.ts
  export const useGuide = (id: string) =>
    useQuery({ queryKey: guideKeys.detail(id), queryFn: ({ signal }) => guidesApi.get(id, signal) });
  ```
- Pass TanStack Query's `signal` through so navigating away cancels in-flight requests
- Query defaults (`@/lib/queryClient`): `staleTime` 60 s, no refetch on window focus, no retry for 4xx `ApiError`, up to 2 retries otherwise. Override per query only with a reason
- Render errors by type: `ApiError` with status 404 → not-found state; other `ApiError` / network errors → retryable error state; `InvalidResponseError` → generic error (it's a contract bug — log it)
- All data access goes through the API gateway
- **Web standards first**: follow established web standards (RFCs, W3C, WHATWG) over ad-hoc conventions. Multi-value query params use `URLSearchParams.append()` per value (RFC 3986 repeated keys), not comma-separated. Dates in ISO 8601. Phone numbers as `tel:` links; external links with `rel="noopener noreferrer"`.

---

## Routing

- React Router 8 with **file-based flat routing** via `@react-router/fs-routes`
- SPA mode (`ssr: false`)
- Routes in `app/routes/` using flat naming: `_index.tsx`, `guides.$guideId.tsx`
- **Route files are thin adapters only** — no business logic, no `useState`/`useQuery`. Each route imports its page component from `src/features/{domain}/pages/{XxxPage}/`, extracts URL params via `useParams`, narrows nullable types with a simple guard (`if (!id) return null`), and passes them as typed props
- Page components in `src/features/{domain}/pages/{XxxPage}/XxxPage.tsx` (with colocated `.module.css` and `index.ts` barrel) own page-level logic: data fetching, state, handlers
- Colocated `*.test.tsx` files in `app/routes/` are excluded from routing by `routes.ts`

---

## State Management

- **Server state**: TanStack Query (queries, cache)
- **Local state**: `useState`, `useReducer`
- **URL state**: search params for anything shareable (search text, selected filters) so links and back/forward work
- **No global client state libraries** — if you need shared state, use React Context

---

## UX and Accessibility

- Cover loading (skeletons that reserve layout), empty, success, partial-failure (one restaurant missing) and error (with retry) states
- Keyboard reachable controls with visible focus; labelled inputs; one `<h1>` per page and ordered headings
- Respect `prefers-reduced-motion`
- Check at a desktop width and a portrait phone width; no horizontal scrolling on phones

---

## TDD Workflow (Red → Green → Refactor)

**Core principle**: Write one test, make it pass, repeat. Never write all tests first, then all implementation. Each test responds to what you learned from the previous cycle.

### Philosophy

Tests verify behavior through **public interfaces**, not implementation details. A good test reads like a specification — "user can filter restaurants by category" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Public interfaces in this codebase:**

| Interface | What you test through |
|---|---|
| Component rendered output | `screen.getByRole()`, `screen.getByText()`, user events |
| Hook return values | `renderHook()` → result.current |
| API client functions | Input → output (mock the network at the boundary with msw) |
| Zod schemas / pure helpers | Input → accepted/rejected / computed result |

**Bad tests** mock internal hooks, assert on component state, or verify through means other than the component's rendered output. Warning sign: your test breaks when you refactor, but behavior hasn't changed.

See [tests.md](tests.md) for good/bad examples and [mocking.md](mocking.md) for mocking guidelines.

### Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** Tests written in bulk test _imagined_ behavior. You end up testing the _shape_ of things rather than user-facing behavior.

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

**1. Plan** — before writing any code:

- List the behaviors to test (not implementation steps)
- Prioritize — you can't test everything; focus on critical paths and complex logic
- Design interfaces for testability: accept dependencies, return results

**2. Tracer bullet** — write ONE test that confirms ONE behavior:

```
RED:   Write test for first behavior → vitest → fails
GREEN: Write minimal code to pass → vitest → passes
```

**3. Incremental loop** — for each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules: one test at a time. Only enough code to pass the current test. Don't anticipate future tests.

**4. Refactor** — after all tests pass:

- Extract duplication
- Simplify interfaces (fewer props, simpler params)
- Re-run the tests after each refactor step
- **Never refactor while RED.** Get to GREEN first.

### Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only (rendered output, hook returns)
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

---

## Testing

### Setup

- Runner: **Vitest** with jsdom environment, `globals: true`
- Utilities: Testing Library React + `@testing-library/user-event`
- Matchers: `@testing-library/jest-dom/vitest` (loaded in `vitest.setup.tsx`)
- Network: **msw** — one shared server (`@/test-utils/server`) started in `vitest.setup.tsx` with `onUnhandledFrame: "error"`, so any request without a handler fails the test; add handlers per test with `server.use(...)` (reset after each test)
- Query components: `renderWithQueryClient(ui)` from `@/test-utils/queryClient` (fresh client per test, `retry: false`)
- Storybook: `.storybook/preview.ts` wraps every story in a `QueryClientProvider`; seed data via props or `queryClient.setQueryData`, never the network
- CSS Modules resolve to their plain local names in tests (`generateScopedName: "[local]"`) — still don't assert on class names

### Commands

```bash
pnpm test                  # Run unit tests (vitest run)
pnpm test:watch            # Watch mode
pnpm test:coverage         # With coverage
```

### Test conventions

- File: `ComponentName.test.tsx` beside the code, or `__tests__/featureName.test.ts`
- **TDD required**: follow the Red → Green → Refactor loop above — one test at a time, vertical slices
- Query by role and accessible name first; `data-testid` only when nothing accessible exists
- Mock the gateway at the network boundary (msw) — not internal hooks
- Test behavior, not implementation details

### Test Pyramid — Your Layers (Unit + Component)

You own the bottom of the test pyramid for the frontend.

**Layer 1 — Unit tests (Vitest)**

Write the most tests here. Target: pure functions, hooks, utilities, Zod schemas, query key factories, API client functions (msw).

| Test this | Example |
|---|---|
| Zod schema | `types.test.ts` — rejects a restaurant without a name |
| Query key factory | `queryKeys.test.ts` — returns correct key structure |
| Custom hook logic | `useRestaurantFilter.test.ts` — filters by category and text |
| Utility / helper | `openingHours.test.ts` — open-now across midnight, missing days |

Do NOT unit-test: trivial getters, CSS class application, component render without behavior.

**Layer 2 — Component tests (Vitest + Testing Library)**

Write moderate-volume tests here. Target: component behavior — user interactions, conditional rendering, prop-driven state, error/loading/empty states.

| Test this | Skip this (covered elsewhere) |
|---|---|
| Filter chip toggles the visible restaurants | Full multi-page journey (E2E) |
| Phone number renders as a `tel:` link | Gateway response contract (API test) |
| Loading / error / empty states | Visual appearance |

**What you do NOT test:**

- Full user journeys spanning multiple pages — that is E2E, owned by `qa-engineer`
- Gateway response schema correctness — API contract test, owned by `qa-engineer` + `backend-developer`

**Push-Down Rule:** If an E2E check catches a rendering bug that your component test should have caught, add the component test.

**Coverage goal:** 100% of decision points + critical paths, NOT 100% line coverage.

### Example test

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag } from "./Tag";

describe("Tag", () => {
  it("renders its label", () => {
    render(<Tag>Cafe</Tag>);
    expect(screen.getByText("Cafe")).toBeInTheDocument();
  });
});

describe("CategoryFilter", () => {
  it("calls onChange with the chosen category", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryFilter categories={["Cafe", "Thai"]} value={[]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Cafe" }));
    expect(onChange).toHaveBeenCalledWith(["Cafe"]);
  });
});
```

---

## Storybook

### Config

- Framework: `@storybook/react-vite` (Storybook 10), reusing `vite.config.ts` — the scripts set `STORYBOOK=true`, which drops the React Router plugin there
- Addons: docs (autodocs, MDX) and a11y (Accessibility panel per story)
- Stories: `src/**/*.stories.@(ts|tsx)` and `src/**/*.mdx`; `.storybook/preview.ts` loads `modern-normalize` + `globals.css` and offers device viewports

### Commands

```bash
pnpm storybook             # Dev server on http://localhost:6006
pnpm build-storybook       # Static build (CI runs it from the root through turbo)
```

### Story conventions

**Every new component MUST have a `.stories.tsx` file.**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FilterChip } from "./FilterChip";

const meta = {
  title: "Features/Guides/FilterChip",
  component: FilterChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { onChange: fn(), children: "Cafe" },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultSelected: true } };
export const Disabled: Story = { args: { isDisabled: true } };
```

- `title` mirrors the folder: `Components/Common/Rating`, `Features/Guides/RestaurantCard`
- `tags: ["autodocs"]`; `fn()` for callbacks
- Cover variants, sizes and states: default, loading, empty, error, disabled, long content; check phone width with the viewport toolbar
- Feed stories plain props or fixtures — never call the gateway from a story
- Check the Accessibility panel; fix violations rather than disabling rules

---

## Linting & Formatting

```bash
pnpm lint                # oxlint + Stylelint
pnpm lint:js             # oxlint only
pnpm lint:js:fix         # oxlint --fix
pnpm lint:css            # Stylelint only
pnpm lint:css:fix        # Stylelint --fix
pnpm type-check          # react-router typegen + tsc --noEmit (run gen:css-types first, or use root `pnpm type-check`)
```

- oxlint config: `web/.oxlintrc.json` (typescript, unicorn, react, jsx-a11y rules; relative-parent and `/index` import bans)
- Stylelint: no `z-index`, no `!important`, rem only, `{ComponentName}__{ElementName}` classes

---

## Environment Variables

Frontend env vars use the `VITE_` prefix (Vite convention). See `web/.env.example`.

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API gateway URL (default: `http://localhost:4000`) |

---

## Checklist for New Feature

**Work in vertical slices using TDD (Red → Green → Refactor).** Don't build all layers then test — build one behavior at a time, test-first.

1. **Setup** — create feature directory: `src/features/{name}/` with `components/`, `hooks/`, `lib/`, `pages/`
2. **Plan** — list behaviors to test, prioritize critical paths, design interfaces for testability
3. **TDD loop per slice** — for each behavior:
   1. Write ONE test (RED) — describe the behavior, not the implementation
   2. Write minimal code to pass (GREEN) — types, API client, hook, component, whatever the test needs
   3. Refactor — only when GREEN; re-run the slice's tests after each change
   4. Add or update `.stories.tsx` for any component created or changed in this slice
4. **Wire up** — create page in `src/features/{name}/pages/{XxxPage}/` and route in `app/routes/`
5. **Run verification (MANDATORY — do NOT skip)**:
    ```bash
    cd web
    pnpm lint:js
    pnpm lint:css
    pnpm gen:css-types && pnpm type-check
    pnpm exec vitest run <paths covering your change>
    ```
    Then check the journey in the browser under `pnpm dev`. Fix all errors before reporting completion.
