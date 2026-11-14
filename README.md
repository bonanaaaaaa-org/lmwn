# Guide to Hidden Gems

LMWN Frontend Assignment 2025 — a restaurant guide web app with an API gateway.

| App | Stack | Port |
| --- | --- | --- |
| `web` | React 19, React Router 8 (SPA), TypeScript 7, TanStack Query, Zod, CSS Modules, React Aria, Storybook, Vitest, oxlint, oxfmt, stylelint | 3000 |
| `e2e` | Playwright (Chromium desktop + mobile) against the running stack | — |
| `api-gateway` | Python 3.14, FastAPI, Pydantic, uv, ruff, pyrefly, pytest | 4000 |

`pnpm dev` in `api-gateway` also starts the provided data server
(guides `:8888`, restaurants `:9999`, images `:7777`).

## Prerequisites

- Node.js ≥ 26 and pnpm
- [uv](https://docs.astral.sh/uv/) (installs Python 3.14 automatically)

## Getting started

```bash
pnpm install
uv sync
pnpm dev        # turbo: data server + gateway + web
```

Open http://localhost:3000. Gateway API docs: http://localhost:4000/docs.

## Common tasks

A husky pre-commit hook (lint-staged) lints with auto-fix and then formats the staged files, and blocks the commit on anything it can't fix.

Tasks run through [Turborepo](https://turbo.build/) and are cached:

```bash
pnpm format:check # oxfmt (web), ruff format (gateway)
pnpm lint         # oxlint + stylelint (web), ruff (gateway)
pnpm type-check   # tsc (web), pyrefly (gateway)
pnpm test         # vitest (web), pytest (gateway)
pnpm test:e2e         # Playwright, desktop + mobile (starts the stack; first run: pnpm --filter e2e exec playwright install chromium)
pnpm test:storybook    # every story in headless Chromium: play functions + axe (first run: pnpm --filter web exec playwright install chromium)
pnpm build-storybook   # static Storybook build (web)
pnpm --filter web storybook   # Storybook dev server on :6006
```

## Accessibility checks

Both checks fail on any axe violation, of any impact, against the WCAG 2.2 A and AA rules. CI runs both.

- **Pages (e2e):** `pnpm test:e2e` runs the Playwright specs on the desktop and mobile projects. Specs call `expectNoAxeViolations(page)` from `e2e/support/axe.ts` once a state has rendered; the full axe results are attached to the HTML report (`pnpm --filter e2e report`). Scope a run with `pnpm --filter e2e test:e2e specs/home.spec.ts`.
- **Components (Storybook):** `pnpm test:storybook` renders every story with Vitest browser mode and runs the a11y addon's axe scan (`a11y.test: "error"` in `web/.storybook/preview.ts`). To see a violation in context, run `pnpm --filter web storybook` and open the story's Accessibility panel.
