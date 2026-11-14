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
- **The web app talks only to the gateway.** Images are the one exception: they load directly from :7777.

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
- **Library: Paraglide JS** (`@inlang/paraglide-js`), set up through its Vite plugin. Messages compile to typed, tree-shakable functions (`m.notFound_title()`). Only strings in use ship, an unknown key or a wrong param fails `type-check`, and no React provider is needed. The compiled output (`web/src/paraglide/`) is generated before `type-check`, `test`, `build` and Storybook, and is never committed. Alternatives considered:
  - React Aria's `useLocalizedStringFormatter`: already bundled, but its params aren't typed per key. It's the fallback if Paraglide ever has to go.
  - react-i18next and react-intl: rejected for bundle size against the Lighthouse 100 target.
  - Lingui: rejected because copy lives in components through its macros.
  - typesafe-i18n: rejected as unmaintained.
- **One catalog:** `web/messages/th.json` holds every user-facing string, including accessible names, `alt`, `title`, document titles and the English brand name. Copy uses glossary terms.
- **Keys mirror the test ID path** (`web/src/lib/testIds.ts`), so an element's `data-testid` maps straight to its copy.
  - Form: `{owning component path}_{role}`. Each kebab-case segment becomes camelCase and `/` becomes `_`. For example, test ID `guide/restaurant-card/read-more` → `guide_restaurantCard_readMore`.
  - Keys are rooted at the component that owns the copy, not the runtime parent chain: `notFound_title`, `errorPanel_retry_label`, `guide_...`.
  - The last segment is the string's role: `title`, `body`, `label`, `ariaLabel`, `alt`.
  - Keys are always called statically with dot access, never built at runtime.
  - CI checks every key against `^[a-z][a-zA-Z0-9]*(_[a-z][a-zA-Z0-9]*)+$`.
- **One locale setting.** Paraglide's base locale `th` drives `<html lang="th">`, React Aria's `I18nProvider` (`th-TH`) and every `Intl` formatter.
- **Formatting goes through one module on `Intl`.** Dates use the Buddhist calendar in `Asia/Bangkok` ("10 มี.ค. 2567"), and numbers and counts use `th-TH`. Components never call `toLocaleString` or build `Intl` objects themselves.
- **Guard:** CI fails on any Thai character in `web/app` or `web/src` code. The only exemption is `web/src/test-utils/fixtures/`, which holds gateway-like sample data and layout stress copy for tests and stories. Tests and stories assert UI copy through the same `m.*()` functions, never a re-typed literal.

## Non-goals

- Server-side rendering and real Open Graph tags. `socialTitle` is used for `document.title` and share text only.
- Pagination, and searching restaurants across Guides.
- i18n beyond Thai: Thai only; no second locale or language switcher (see i18n above). Also dark mode, user accounts and saved restaurants.
- Replacing or testing the provided Data Server.
