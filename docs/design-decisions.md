# Design decisions

Technical decisions agreed during the design interview for Guide to Hidden Gems. Product behaviour lives in [the spec](specs/guide-to-hidden-gems.md); domain terms live in [GLOSSARY.md](../GLOSSARY.md).

## Facts about the provided Data Server

Verified against `lmwn-assignment-2025-server@0.0.0-beta.1` (its source and live responses). Our code doesn't test this server; these facts only shape gateway fixtures and handling.

- Routes: `GET /guides` (all guide IDs), `GET /guides/{id}`, `GET /guide-items/{id}` on :8888, and `GET /restaurants/{id}` on :9999. There's no search, filtering, pagination or query params.
- An unknown ID returns `200` with body `null`, not 404.
- Responses include Mongo internals (`_id`, `__v`, and `_id` inside each `workingHours` entry). The server uses an in-memory MongoDB internally; we don't use or depend on Mongo.
- `branch`, `line`, `instagram` and `facebook` are often absent. `rating: 0` with `numberOfReviews: 0` means unrated. Days missing from `workingHours` are closed.
- No CORS headers, so the browser can only reach data through the gateway. Images on :7777 load fine in `<img>` but are sent as `text/plain`; a missing image returns `200` with an empty body.
- Sample data: 2 Guides, 13 Guide Items, 12 Restaurants. No injected failures or latency.

## System

- **No database.** The gateway is stateless apart from an in-memory cache.
- **The web app talks only to the gateway.** Locally, images are the one exception: they load directly from :7777. When deployed, the gateway serves them too (see Deployment).

## API gateway (FastAPI, ports and adapters)

- **Endpoints**
  - `GET /guides?q=&tag=` returns `{ items: GuideSummary[], total: number }`. A GuideSummary has id, title, shortDescription, cover, tags and Guide Item count. There's no pagination for now; the envelope leaves room for `page`/`limit` later.
  - `GET /guides/{guideId}` returns the Guide with every Guide Item and its Restaurant, in guide order, in one response.
- **Search** happens in the gateway, because upstream can't search.
  - `q` is trimmed, NFC-normalised and matched case-insensitively as plain "contains" text (never a regex) against title, shortDescription and Tags.
  - `tag` is an exact Tag match. It can repeat, and a Guide must match all given Tags. `q` and `tag` combine with AND.
  - An empty `q` matches everything. A `q` over 100 characters returns 422.
- **Fan-out** to upstream runs in parallel, at most 8 requests at a time.
- **Error mapping** (each error body is `{ "detail": "<safe message>" }`, with no upstream internals)
  - upstream `null` → 404
  - upstream timeout → 504
  - upstream 5xx, or a body that doesn't match the schema → 502
  - Guide or Guide Item failure → the whole request fails
  - Restaurant failure → the Guide Item is returned with its Restaurant marked unavailable (an Unavailable Restaurant)
- **Input safety:** a `guideId` that isn't UUID-shaped gets a 404 without calling upstream. IDs taken from upstream are URL-encoded when building the next request.
- **Response models** are the gateway's own contract.
  - Mongo internals are dropped, and absent optional fields stay absent.
  - Working Hours are normalised to minutes since midnight for all 7 days, with missing days closed. Overnight ranges keep a close time past 1440 (18:00–02:00 becomes 1080–1560).
    - Equal open and close times mean open for 24 hours (00:00–00:00 becomes 0–1440), not an error.
    - `24:00` is accepted as a closing time only and means midnight at the end of the opening day (17:00–24:00 becomes 1020–1440). As an opening time it is malformed.
  - The response includes `timeZone: "Asia/Bangkok"`.
  - Time-dependent facts like Open Now are **not** computed in the gateway.
- **Caching:** upstream reads are cached in memory for about 60 s, and responses send `Cache-Control: public, max-age=60`.
- **Tests:** pytest with respx fixtures shaped like real upstream data, including `null`, missing optional fields and Unrated Restaurants. The real Data Server is never started in unit tests.

## Web (React Router 8 SPA)

- **Routes and URL state:** `/` is the Guide Index and `/guides/:guideId` is a Guide. Search, filter and sort state live in query params. Share links point at a Guide Item with `#item-:guideItemId`; the page scrolls to it once data has rendered.
- **Search box:** requests fire 300 ms after typing stops, or immediately on Enter. Previous results stay on screen while new ones load (TanStack `placeholderData`).
- **Filtering and sorting** on the Guide page happen in the browser, over the hydrated Guide.
- **Open Now** is computed in the browser: convert "now" to the gateway's `timeZone` (weekday and minutes), then check today's ranges plus yesterday's ranges that run past midnight.
- **Retries:** TanStack Query retries failures up to 2 times, but never a 404.
- **Images:** `srcset` from small and large URLs, `loading="lazy"` below the fold, a high-priority cover, fixed aspect ratios, and a placeholder when an image fails or is empty.
- **Look:** "saffron and ink": neutral greys, near-black text and one saffron accent (#f2b705), used only as a fill under dark text; accent-coloured text uses a dark gold. The font is Mali (rounded, looped Thai มีหัว) for body and headings, self-hosted through Fontsource. Spacing, control heights and radii follow an 8-point grid. No LINE MAN or Wongnai branding.
- **Tests:** Vitest, Testing Library and MSW, with tests focused on behaviour; Storybook stories for every component; Playwright e2e against the running stack.
- **axe:**
  - `@axe-core/playwright` runs in e2e with the WCAG 2.2 A and AA tags, and any violation fails the run.
  - The Storybook a11y addon moves from `test: "todo"` to `test: "error"`, with story tests wired into CI, so component-level violations also fail.

## i18n (Thai only)

- **Thai is the only locale.** There's no second locale, language switcher, locale routing or detection. Data from the gateway (Guide, Guide Item and Restaurant text) renders as served. Adding a locale later means adding a catalog and a switcher, not rewriting components.
- **Library: Paraglide JS** (`@inlang/paraglide-js`), set up through its Vite plugin. Messages compile to typed, tree-shakable functions (`m.notFound_title()`). Only strings in use ship. An unknown key, or a missing or extra param, fails `type-check`; Paraglide doesn't type param values. No React provider is needed. The compiled output (`web/src/paraglide/`) is generated before `type-check`, `test`, `build` and Storybook, and is never committed. Alternatives considered:
  - React Aria's `useLocalizedStringFormatter`: already bundled, but its params aren't typed per key. It's the fallback if Paraglide ever has to go.
  - react-i18next and react-intl: rejected for bundle size against the Lighthouse 100 target.
  - Lingui: rejected because copy lives in components through its macros.
  - typesafe-i18n: rejected as unmaintained.
- **One catalog:** `web/messages/th.json` holds every user-facing string, including accessible names, `alt`, `title`, document titles and the English brand name. Copy uses glossary terms.
- **Keys mirror the test ID path** (`web/src/lib/testIds.ts`), so an element's `data-testid` maps straight to its copy.
  - Form: `{owning component path}_{role}`. Each kebab-case segment becomes camelCase and `/` becomes `_`. For example, the read-more link in RestaurantCard (test ID `…/restaurant-card/read-more`) → `restaurantCard_readMore_label`.
  - Keys are rooted at the component that owns the copy, not the runtime parent chain. Shared components use their own name (`notFound_title`, `errorPanel_retry_label`, `header_logo_label` rather than `app_header_…`), and page-level copy starts with the page (`guide_…`, `guideIndex_…`). A sub-component that only ever renders inside another component nests under it (PhotoStrip → `restaurantCard_photoStrip_*`).
  - The last segment is the string's role: `title`, `body`, `label`, `ariaLabel`, `alt`.
  - Keys are always called statically with dot access, never built at runtime.
  - CI checks every key against `^[a-z][a-zA-Z0-9]*(_[a-z][a-zA-Z0-9]*)+$` and rejects bracket access (`m[…]`). A unit test checks that every catalog key compiled to a message function.
- **One locale setting.** Paraglide's base locale `th` drives `<html lang="th">`, React Aria's `I18nProvider` (`th-TH`) and every `Intl` formatter.
- **Formatting goes through one module on `Intl`.** Dates use the Buddhist calendar in `Asia/Bangkok` ("10 มี.ค. 2567"), and numbers and counts use `th-TH`. The module is `web/src/lib/format.ts`; components never call `toLocaleString` or build `Intl` objects themselves. The one exception is a number placed inside a message with Paraglide's `{x: number}`, which Paraglide formats for the same base locale. Dates are never formatted inside messages: format them with `formatDate` (which applies the Buddhist calendar and `Asia/Bangkok`) and pass the result in as a string.
- **Guard:** CI fails on any Thai character in `web/app` or `web/src` code. Two places are exempt: `web/src/test-utils/fixtures/`, which holds gateway-like sample data and layout stress copy for tests and stories (oxlint stops production code from importing `@/test-utils`), and the generated `web/src/paraglide/`. Tests and stories assert UI copy through the same `m.*()` functions, never a re-typed literal.

## Deployment

Settled in #22; the details are in [infra/README.md](../infra/README.md).

- **GCP with Terraform**, following bonanaaaaaa-org/personal-finance's `infra/`.
  - repo-management provides the projects, the deploy identity (workload identity federation, no keys), the R2 state bucket and the zone-scoped Cloudflare token.
  - `infra/` defines everything else.
  - Only prod deploys: the `pr` project isn't billed, so pull requests run offline infrastructure checks (`fmt`, `validate`, `terraform test` with mock providers).
- **The gateway and the data server share one Cloud Run service.**
  - The gateway is the ingress container. The provided data server is a sidecar, because it listens on three ports and a service exposes one. The gateway reaches it on `localhost`.
  - The data server's MongoDB binary is baked into its image at build time.
  - The service scales to zero.
- **Photos go through the gateway.**
  - The data server's photo URLs point at `localhost:7777`. When `PUBLIC_BASE_URL` is set, the gateway rewrites them to `{PUBLIC_BASE_URL}/photos/r/{width}/{height}/{file}` and serves that route by proxying the sidecar.
  - The route accepts only the four sizes the data server's photos use and plain image file names, before calling upstream. It sends the right image type and `Cache-Control: public, max-age=86400`, and answers 404 for a missing image.
  - When `PUBLIC_BASE_URL` is unset (local dev), URLs pass through unchanged.
- **The web app is on Firebase Hosting.**
  - It is a static SPA build: every route except `/assets/**` is rewritten to `/index.html`, the hashed `/assets/**` are cached as immutable, and everything else is `no-cache`.
  - It is built in the deploy job with `VITE_API_BASE_URL` set to the API domain.
- **Domains on `bonanaaaaaa.dev`.**
  - The web app is `hidden-gems.bonanaaaaaa.dev` (a Hosting custom domain) and the gateway is `api-hidden-gems.bonanaaaaaa.dev` (a Cloud Run domain mapping).
  - Their Cloudflare records are DNS only, so Google issues the certificates. The deploy identity verifies the zone with its own TXT record.
- **The Storybook is deployed next to the app** (#35), so reviewers can browse the components and their states without cloning the repo.
  - It is a second Firebase Hosting site (`<project>-storybook`) on `storybook-hidden-gems.bonanaaaaaa.dev`, with the same kind of DNS-only Cloudflare records as the web domain.
  - One `web/firebase.json` deploys both, as the hosting targets `web` (`build/client`) and `storybook` (`storybook-static`). The deploy script maps the targets to Terraform's site IDs.
  - The Storybook's hashed `/assets/**` are cached as immutable and everything else is `no-cache`. Every response sends `X-Robots-Tag: noindex, nofollow`, so search engines leave it out.
  - Stories use fixtures only. The deployed Storybook never calls the gateway or the Data Server, and the gateway's CORS doesn't allow it. The deploy job checks that its bundle doesn't contain the API host, and the post-deploy Playwright run renders every story and fails on any request off the Storybook's origin.
  - Only `main` deploys it. Per-PR previews are out of scope, because the `pr` project isn't billed.
- **CORS allows only the web domain.** While its certificate is pending, the gateway also allows the site's `web.app` origin.
- **CI/CD.** Each push to `main` runs one deploy job (`environment: prod`, never cancelled half-way). It builds and pushes the images, applies Terraform, deploys the web app and the Storybook, then runs a smoke test and the Playwright suite against the live site. Until the Storybook domain's certificate is active, those checks use the Storybook's `web.app` URL and the job warns, for at most a day after the domain was created. Re-running it for the same commit plans no changes (apart from the one-off CORS change once the web domain is ready).

## Non-goals

- Server-side rendering and real Open Graph tags. `socialTitle` is used for `document.title` and share text only.
- Pagination, and searching restaurants across Guides.
- i18n beyond Thai: Thai only; no second locale or language switcher (see i18n above). Also dark mode, user accounts and saved restaurants.
- Replacing or testing the provided Data Server.
