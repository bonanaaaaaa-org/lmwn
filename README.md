# Guide to Hidden Gems

LMWN Frontend Assignment 2025 — a restaurant guide web app with an API gateway.

| App | Stack | Port |
| --- | --- | --- |
| `web` | React 19, React Router 8 (SPA), TypeScript 7, TanStack Query, Zod, CSS Modules, React Aria, Storybook, Vitest, oxlint, oxfmt, stylelint | 3000 |
| `e2e` | Playwright (Chromium desktop + mobile) against the running stack | — |
| `api-gateway` | Python 3.14, FastAPI, Pydantic, uv, ruff, pyrefly, pytest | 4000 |

`pnpm dev` in `api-gateway` also starts the provided data server
(guides `:8888`, restaurants `:9999`, images `:7777`).

## Deployed

- Web app: https://hidden-gems.bonanaaaaaa.dev
- API gateway: https://api-hidden-gems.bonanaaaaaa.dev (`/health`, `/docs`)
- Storybook: https://storybook-hidden-gems.bonanaaaaaa.dev (shared and page components and their states, with fixtures only)

Every push to `main` deploys to Google Cloud (Cloud Run and Firebase Hosting) through Terraform in [`infra/`](infra/README.md).

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
pnpm lighthouse        # Lighthouse on the production build (needs the gateway running; see below)
```

## Lighthouse

The targets: 100 in Performance, Accessibility, Best Practices and SEO on the Guide Index and a Guide page with the desktop preset; the same on mobile except Performance, which must be 90 or more. Lighthouse's mobile preset simulates a mid-range phone on slow 4G (150 ms round trips, about 1.6 Mbps, a 4× slower CPU), where 100 would need everything before the cover paints (JS, CSS, fonts, data and the cover itself) under about 220 KB.

```bash
pnpm --filter api-gateway dev   # gateway :4000 + Data Server, in another terminal
pnpm lighthouse                 # pnpm build, then audit the preview on :3000
```

`pnpm lighthouse` builds the web app, serves `build/client` with `vite preview` on :3000 (the origin the local gateway allows), and audits `/` and the first Guide from the gateway with both presets in the light and dark themes (Chrome's `--force-dark-mode` for dark; `--theme light` or `--theme dark` for one), 5 runs each in headless Chromium (Playwright's, or `CHROME_PATH`). It keeps each median run, writes HTML and JSON reports to `web/lighthouse-reports/`, prints a Markdown table, and exits 1 if a score misses its target. To skip the build, or audit somewhere else:

```bash
cd web
node scripts/lighthouse.mjs --runs 3                    # the existing build
node scripts/lighthouse.mjs --base-url https://hidden-gems.bonanaaaaaa.dev \
  --api-url https://api-hidden-gems.bonanaaaaaa.dev     # the deployed site, no preview
```

Scores move a few points between runs on a busy machine, which is why it takes the median.

## Accessibility checks

Both checks fail on any axe violation, of any impact, against the WCAG 2.2 A and AA rules. CI runs both.

- **Pages (e2e):** `pnpm test:e2e` runs the Playwright specs on the desktop and mobile projects. Specs call `expectNoAxeViolations(page)` from `e2e/support/axe.ts` once a state has rendered; the full axe results are attached to the HTML report (`pnpm --filter e2e report`). Scope a run with `pnpm --filter e2e test:e2e specs/home.spec.ts`.
- **Components (Storybook):** `pnpm test:storybook` renders every story with Vitest browser mode and runs the a11y addon's axe scan (`a11y.test: "error"` in `web/.storybook/preview.ts`). To see a violation in context, run `pnpm --filter web storybook` and open the story's Accessibility panel.

## Test reports (Allure)

Every suite also writes [Allure](https://allurereport.org/) results into its own package: the Playwright e2e on desktop and mobile (`e2e/allure-results`, with the trace, screenshot and video of a failed test attached, and the trace of a flaky test that passed on retry, replayable in Allure's trace viewer), Vitest unit and Storybook story tests (`web/allure-results/unit` and `storybook`), and the gateway's pytest (`api-gateway/allure-results`). `pnpm test`, `pnpm test:storybook` and `pnpm test:e2e` replace their suite's results on each run.

```bash
pnpm allure   # combines whatever results exist into one report (allure-report/index.html) and opens it
```

Run the suites you care about first, for example `pnpm test` and `pnpm test:e2e`. The report's configuration is `allurerc.mjs`. Both `allure-results/` and `allure-report/` are git-ignored.

CI combines the results of every run into one report, after failed runs too, and uploads it to the shared report host from repo-management: `https://allure-reports.bonanaaaaaa.workers.dev/lmwn/<report>/`, signed in through Cloudflare Access. A pull request's report is `pr-<number>` and a push to `main` replaces `main`. The run's summary (the **Allure report** job) links to it, and `https://allure-reports.bonanaaaaaa.workers.dev/lmwn/` lists every report. The upload authenticates with the run's GitHub OIDC token, with no stored secret. If the `ALLURE_REPORTS_URL` variable is missing or the host is down, the job only warns: the test jobs alone decide whether CI passes.
