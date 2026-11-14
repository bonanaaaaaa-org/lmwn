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
- **Look:** "saffron and ink": neutral greys, near-black text and one saffron accent (#f2b705), used only as a fill under dark text; accent-coloured text uses a dark gold. Krub headings with Sarabun body, both looped Thai (มีหัว), self-hosted through Fontsource. Spacing, control heights and radii follow an 8-point grid. No LINE MAN or Wongnai branding.
- **Tests:** Vitest, Testing Library and MSW, with tests focused on behaviour; Storybook stories for every component; Playwright e2e against the running stack.
- **axe:**
  - `@axe-core/playwright` runs in e2e with the WCAG 2.2 A and AA tags, and any violation fails the run.
  - The Storybook a11y addon moves from `test: "todo"` to `test: "error"`, with story tests wired into CI, so component-level violations also fail.

## Non-goals

- Server-side rendering and real Open Graph tags. `socialTitle` is used for `document.title` and share text only.
- Pagination, and searching restaurants across Guides.
- i18n (the UI is Thai only), dark mode, user accounts and saved restaurants.
- Replacing or testing the provided Data Server.
