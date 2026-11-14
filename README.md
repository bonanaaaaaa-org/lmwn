# Guide to Hidden Gems

LMWN Frontend Assignment 2025: a restaurant guide web app with its own API gateway. Diners browse and search editor-written **Guides**, then read each Guide's restaurants with photos, Working Hours, Open Now, filters and share links. The UI is in Thai, follows the system's light or dark theme, and installs as an app that reopens visited Guides offline.

- **What it does and why:** [the spec](docs/specs/guide-to-hidden-gems.md) (acceptance criteria, edge cases, success criteria)
- **How it's built and why:** [design decisions](docs/design-decisions.md)
- **What the words mean:** [GLOSSARY.md](GLOSSARY.md) (Guide, Guide Item, Unavailable Restaurant, Open Now, …). The code and UI copy use these terms.

## Try it without cloning

| | URL |
| --- | --- |
| Web app | https://hidden-gems.bonanaaaaaa.dev |
| API gateway | https://api-hidden-gems.bonanaaaaaa.dev ([`/health`](https://api-hidden-gems.bonanaaaaaa.dev/health), [`/docs`](https://api-hidden-gems.bonanaaaaaa.dev/docs)) |
| Storybook | https://storybook-hidden-gems.bonanaaaaaa.dev (every component and its states, with fixtures only) |

Every push to `main` deploys to Google Cloud (Cloud Run for the gateway and Data Server, Firebase Hosting for the app and the Storybook) through Terraform in [`infra/`](infra/README.md). The gateway scales to zero, so the first request after a quiet spell takes a few seconds.

## Run it locally

You need:

- Node.js 26 or newer (`.nvmrc` pins the version CI uses) and pnpm 12 (`packageManager` in `package.json` pins the exact version).
- [uv](https://docs.astral.sh/uv/). It installs Python 3.14 for the gateway by itself.
- Access to this private repository, and free ports 3000 (web), 4000 (gateway), and 8888, 9999 and 7777 (the provided Data Server).
- macOS, or Linux on x86-64. The MongoDB version the provided Data Server pins has no build for Debian on arm64, so in a Linux container on Apple silicon use `--platform linux/amd64`.

```bash
git clone https://github.com/bonanaaaaaa-org/lmwn.git
cd lmwn
pnpm install    # web, e2e, the provided Data Server (and its MongoDB binary) and the git hooks
uv sync         # the gateway's Python environment (.venv)
pnpm dev        # Data Server + gateway + web, through Turborepo
```

Then open:

- http://localhost:3000: the app (the Guide Index; open a Guide from there)
- http://localhost:4000/docs: the gateway's OpenAPI docs. http://localhost:4000/health answers `{"status":"ok"}`.

On a new machine, `pnpm install` also downloads the MongoDB binary the Data Server uses for its in-memory store (into `~/.cache/mongodb-binaries`, about 160 MB), and `pnpm dev` takes a few seconds to seed it before the gateway has data. Stop everything with Ctrl+C. No `.env` is needed: the web app defaults to the gateway on `http://localhost:4000` ([`web/.env.example`](web/.env.example)), and the gateway's settings are in [`api-gateway/README.md`](api-gateway/README.md).

## Architecture

```text
Browser ──► web (React Router SPA, :3000) ──► api-gateway (FastAPI, :4000) ──► Data Server (provided, unchanged)
                                                                                guides :8888 · restaurants :9999 · images :7777
```

- **web** ([`web/`](web/)) is a single-page app: React 19, React Router 8 in SPA mode, TanStack Query, Zod, React Aria, CSS Modules, and Paraglide JS for the Thai copy. Routes are `/` (the Guide Index) and `/guides/:guideId` (a Guide). Search, filter and sort state lives in the URL, so reload, Back and shared links restore the same view. Code is grouped by feature (`web/src/features/guide-index`, `web/src/features/guides`) with shared components in `web/src/components`. Production builds add a service worker (see [PWA](#offline-and-install-pwa)).
- **api-gateway** ([`api-gateway/`](api-gateway/README.md)) is the only thing the browser asks for data. (Locally, photos are the one exception: they load straight from the Data Server on :7777.) It turns the Data Server's ID lists and raw records into two endpoints, `GET /guides?q=&tag=` and `GET /guides/{guideId}` (the Guide with every Guide Item and its Restaurant, in one response), with its own response models and safe error bodies. It is built as ports and adapters: `app/domain` (Guides, Working Hours, search), `app/application` (the two use cases), `app/adapters` (HTTP in, the Data Server out).
- **Data Server** is the provided `lmwn-assignment-2025-server` npm package, run as published. It has no search, no CORS, returns `200 null` for unknown IDs and leaks Mongo internals; the gateway absorbs all of that ([the facts we verified](docs/design-decisions.md#facts-about-the-provided-data-server)).

When deployed, the gateway and the Data Server run as one Cloud Run service (the Data Server is a sidecar on `localhost`), and the gateway also serves the photos. See [Deployment](docs/design-decisions.md#deployment).

## Key trade-offs

The reasoning for each is in the [design decisions](docs/design-decisions.md).

- **Search happens in the gateway.** The Data Server can't search or filter, and the browser can't reach it (no CORS). The gateway fetches every Guide (in parallel, at most 8 requests at a time, cached for about 60 s) and matches `q` as NFC-normalised, case-insensitive "contains" text against title, shortDescription and Tags, so Thai text matches inside words. With 2 Guides this is cheap; with many more Guides it would need a search index and pagination, which are non-goals for now.
- **Partial failure keeps the Guide.** If one Restaurant fails to load, the Guide still returns and that Guide Item becomes an Unavailable Restaurant: the card keeps the editor's write-up and photos. If the Guide itself or a Guide Item fails, the whole request fails (404, 502 or 504 with a safe `{detail}` body). The web app retries a 502, 504 or network error twice, then offers "ลองใหม่" (try again); a 404 is never retried and shows "ไม่พบไกด์นี้" (guide not found).
- **Open Now is split between the gateway and the browser.** The gateway normalises Working Hours (minutes since midnight for all 7 days, overnight ranges past 1440, missing days closed) and sends `timeZone: "Asia/Bangkok"`. The browser decides Open Now (`web/src/features/guides/lib/openNow.ts`), because the answer depends on the current moment: the gateway caches responses for 60 s, and a page left open must change when a Restaurant opens or closes. Thailand time is used whatever the viewer's own time zone.
- **No database.** The gateway is stateless apart from an in-memory cache with a 60 s TTL, and responses send `Cache-Control: public, max-age=60`. There is nothing to migrate or back up, and each deployed instance seeds its own copy of the sample data.
- **SPA without server-side rendering.** The app is a static build on Firebase Hosting, so it can't serve real Open Graph tags (`socialTitle` sets the tab title and share text only). To keep the first paint fast without SSR, an inline script in `index.html` starts the page's gateway request, route code and cover image before React loads ([#16](https://github.com/bonanaaaaaa-org/lmwn/issues/16), see [Lighthouse](#lighthouse)).
- **Filtering and sorting on the Guide page happen in the browser.** A Guide arrives whole, so Category, Open Now, delivery and pickup filters and sorting by Rating (Unrated Restaurants last) run over the loaded data with no extra requests, and stay in the URL.

## Non-goals

- Server-side rendering and real Open Graph link previews.
- Pagination, and searching restaurants across Guides.
- A database, user accounts, and saved or favourite restaurants. The PWA's offline copy of Guides already opened is a cache, not a saved list.
- For the PWA: push notifications, background sync, app-store packaging (TWA), and offline access to Guides never opened.
- i18n beyond Thai: Thai only; no second locale or language switcher.
- Per-Guide or per-photo theming, high-contrast themes, and syncing the theme choice across devices.
- Replacing, modifying or testing the provided Data Server.
- LINE MAN or Wongnai branding.

## Thai copy (i18n)

Thai is the only locale. Every user-facing string, including accessible names and `alt` text, is in one catalog, [`web/messages/th.json`](web/messages/th.json), compiled by Paraglide JS into typed functions (`m.notFound_title()`); an unknown key, or a missing or extra param, fails `type-check`. Keys mirror the test IDs. Dates use the Buddhist calendar in `Asia/Bangkok` ("10 มี.ค. 2567") through `web/src/lib/format.ts`. CI fails on any Thai character in `web/app` or `web/src` code outside the test fixtures. Details: [i18n decisions](docs/design-decisions.md#i18n-thai-only).

## Dark mode

The app follows the system's light or dark setting, live. The theme toggle in the header (system, light or dark) overrides it, and the choice is remembered on that device. Every colour is a `light-dark()` token in `web/src/styles/globals.css`, so components carry no theme styles, and a small script in the document head sets the theme before the first paint, so there is no flash. Storybook stories, their axe scans and Lighthouse run in both themes. Details: [Dark mode decisions](docs/design-decisions.md#dark-mode) ([#47](https://github.com/bonanaaaaaa-org/lmwn/issues/47)).

## Offline and install (PWA)

The web app is an installable Progressive Web App (`vite-plugin-pwa` with Workbox and our own worker, `web/src/sw.ts`). The app shell is precached. Gateway responses are network-first (the last good copy after 3 s or offline), and photos are cache-first, so a Guide or search the diner has opened reopens offline, photos included. A Guide never opened shows the error panel's offline message. A new version waits until the diner taps "อัปเดต" (update) in a toast. The worker is registered only in production builds, so `pnpm dev`, Storybook and Vitest never have one.

The quickest way to try it is the [deployed app](https://hidden-gems.bonanaaaaaa.dev): open a Guide, then install it from Chrome's address bar or go offline in DevTools and reload. Locally, run the production build against the gateway, with the gateway and Data Server running (`pnpm --filter api-gateway dev`, instead of `pnpm dev`):

```bash
pnpm --filter web build
pnpm --filter web exec vite preview --port 3000 --strictPort   # :3000 is the origin the local gateway allows
```

Locally, photos come straight from the Data Server on :7777, a different origin, so they aren't cached offline. The PWA e2e specs (in `pnpm test:e2e`) start a second gateway on :4300 that serves photos as the deployed one does. Details: [PWA decisions](docs/design-decisions.md#pwa-43) ([#43](https://github.com/bonanaaaaaa-org/lmwn/issues/43)).

## Common tasks

A husky pre-commit hook (lint-staged) lints with auto-fix and then formats the staged files, and blocks the commit on anything it can't fix. Tasks run through [Turborepo](https://turbo.build/) and are cached:

```bash
pnpm format:check     # oxfmt (web, e2e), ruff format (gateway)
pnpm lint             # oxlint, stylelint and the Thai copy guard (web), oxlint (e2e), ruff (gateway)
pnpm type-check       # tsc (web, e2e), pyrefly (gateway)
pnpm test             # Vitest (web), pytest with a 90% coverage gate (gateway)
pnpm test:e2e         # Playwright + axe, desktop and mobile; starts pnpm dev, or reuses one already running,
                      #   plus the PWA specs against a production build on :4173 with a second gateway on :4300
                      #   (first run: pnpm --filter e2e exec playwright install chromium)
pnpm test:storybook   # every story in headless Chromium: play functions + axe
                      #   (first run: pnpm --filter web exec playwright install chromium)
pnpm build-storybook  # static Storybook build (web)
pnpm --filter web storybook  # Storybook dev server on :6006
pnpm lighthouse       # Lighthouse on the production build (see below)
pnpm allure           # one HTML report from the suites you've run (see below)
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the format, lint, type-check, test, build, Storybook and e2e checks on every pull request, plus Terraform checks, and builds the Allure report; pushes to `main` then deploy. Lighthouse runs locally only.

## Accessibility checks

Both fail on any axe violation, of any impact, against the WCAG 2.2 A and AA rules, and CI runs both.

- **Pages:** the Playwright specs call `expectNoAxeViolations(page)` (`e2e/support/axe.ts`) in each state the spec lists, at desktop and phone sizes. Full axe results are attached to the HTML report (`pnpm --filter e2e report`). Scope a run with `pnpm --filter e2e test:e2e specs/home.spec.ts`.
- **Components:** `pnpm test:storybook` runs the a11y addon's scan on every story (`a11y.test: "error"` in `web/.storybook/preview.ts`). To see a violation in context, open the story's Accessibility panel in `pnpm --filter web storybook`.

## Lighthouse

The agreed targets ([#16](https://github.com/bonanaaaaaa-org/lmwn/issues/16)), as the median of 5 runs on both the Guide Index and a Guide page, in the light and dark themes:

| Preset | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Desktop | 100 | 100 | 100 | 100 |
| Mobile | ≥ 90 | 100 | 100 | 100 |

Mobile Performance 100 is out of reach for this stack without SSR: the mobile preset simulates a mid-range phone on slow 4G, where everything before the cover paints (JS, CSS, fonts, data and the cover) would have to fit in about 220 KB. At [#16](https://github.com/bonanaaaaaa-org/lmwn/pull/41) the mobile Performance medians were 94 (Guide Index) and 91 (Guide page), and every other score was 100. The PWA and dark mode kept them: with dark mode merged, mobile was 93 and 91 in both themes ([#50](https://github.com/bonanaaaaaa-org/lmwn/pull/50)).

```bash
pnpm --filter api-gateway dev   # gateway + Data Server, in another terminal (stop pnpm dev first: :3000 must be free)
pnpm lighthouse                 # builds the web app, serves it with vite preview on :3000 and audits it
```

It uses Playwright's headless Chromium (first run: `pnpm --filter web exec playwright install chromium`) or the browser at `CHROME_PATH`.

Each page and preset is audited in both themes (dark through Chrome's `--force-dark-mode`; `--theme light` or `--theme dark` audits one). It writes HTML and JSON reports to `web/lighthouse-reports/`, prints a Markdown table and exits 1 if a score misses its target. To audit the existing build or the deployed site:

```bash
cd web
node scripts/lighthouse.mjs --runs 3                    # the existing build
node scripts/lighthouse.mjs --base-url https://hidden-gems.bonanaaaaaa.dev \
  --api-url https://api-hidden-gems.bonanaaaaaa.dev     # the deployed site, no preview
```

Scores move a few points between runs on a busy machine, which is why it takes the median.

## Test reports (Allure)

Every suite also writes [Allure](https://allurereport.org/) results into its own package, labelled by layer: Playwright e2e on desktop and mobile (`e2e/allure-results`), Vitest unit and Storybook story tests (`web/allure-results/unit` and `storybook`), and the gateway's pytest (`api-gateway/allure-results`). Each run of `pnpm test`, `pnpm test:storybook` or `pnpm test:e2e` replaces its suite's results; `pnpm allure` combines whatever exists into `allure-report/index.html` (configured in `allurerc.mjs`) and opens it. Both `allure-results/` and `allure-report/` are git-ignored.

A failed e2e test keeps its Playwright trace, screenshot and video, and the report attaches them. CI retries a failed e2e test twice, and Allure marks a test that passed on a retry as flaky; its trace is kept too (`retain-on-failure-and-retries`, [#42](https://github.com/bonanaaaaaa-org/lmwn/pull/42)). Traces replay in Allure's trace viewer. Passing tests keep no trace, which keeps the single-file report small enough to upload.

**CI's reports** are at https://allure-reports.bonanaaaaaa.workers.dev/lmwn/ (the list), with `pr-<number>` for a pull request and `main` for the latest push to `main`; each run's **Allure report** job links to its own. The host is behind Cloudflare Access: members of the `bonanaaaaaa-org` GitHub organization sign in with GitHub, and members of the owner's Cloudflare account or an email the owner adds can sign in with a one-time PIN. CI builds the report after failed runs too and uploads it with the run's GitHub OIDC token, with no stored secret. If the host is down, that job only warns: the test jobs alone decide whether CI passes.

## Repository layout

| Path | What |
| --- | --- |
| [`web/`](web/) | The React Router SPA, its stories and unit tests |
| [`api-gateway/`](api-gateway/README.md) | The FastAPI gateway, its pytest suite and Dockerfiles (gateway and Data Server) |
| [`e2e/`](e2e/) | Playwright specs against the running stack (desktop and mobile) |
| [`infra/`](infra/README.md) | Terraform and deploy scripts for Google Cloud and Cloudflare DNS |
| [`docs/`](docs/) | The spec and the design decisions |
| [`GLOSSARY.md`](GLOSSARY.md) | Domain terms |
