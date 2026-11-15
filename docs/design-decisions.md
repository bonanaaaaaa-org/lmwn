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
- **Temporal, not `Date`** (#60). Times are `Temporal.Instant`s, and the gateway's `timeZone` is applied explicitly (`toZonedDateTimeISO`), so nothing depends on the device's time zone. Oxlint bans the `Date` global in `web/` and `e2e/`. Safari doesn't ship Temporal yet, so `@/lib/temporal` loads `temporal-polyfill` (about 20 KB gzipped) before the first render, only when `globalThis.Temporal` is missing. The service worker keeps that chunk out of the precache and caches it at runtime for the browsers that load it. Fake clocks still work: Vitest fakes `Temporal`, and Playwright's `page.clock` controls `Temporal.Now`.
- **Retries:** TanStack Query retries failures up to 2 times, but never a 404.
- **Images:** `srcset` from small and large URLs, `loading="lazy"` below the fold, a high-priority cover, fixed aspect ratios, and a placeholder when an image fails or is empty. Phones get only the small photo in a photo strip (the lightbox still shows the large one), and a strip requests its photos only once it is within about 300 px of the viewport.
- **Loading the first page (#16):** `index.html` is the same for every route, so an inline script in its head reads the path and starts the page's gateway request, its route code (`modulepreload`, from React Router's build manifest) and, once the data arrives, its cover (`<link rel="preload" as="image">` with the page's own `srcset` and `sizes`). The app's first `fetch` of that URL takes the in-flight response (`takePreloadedResponse`). The app loads one stylesheet (`cssCodeSplit: false`), so the head declares the cascade layer order before it (`CSS_LAYER_ORDER`). Lighthouse targets and how to run the audit are in the README.
- **Look:** "saffron and ink": neutral greys, near-black text and one saffron accent (#f2b705), used only as a fill under dark text; accent-coloured text uses a dark gold. A dark theme mirrors it (see Dark mode). The font is Mali (rounded, looped Thai มีหัว) for body and headings, self-hosted through Fontsource. Spacing, control heights and radii follow an 8-point grid. No LINE MAN or Wongnai branding.
- **Tests:** Vitest, Testing Library and MSW, with tests focused on behaviour; Storybook stories for every component; Playwright e2e against the running stack.
- **axe:**
  - `@axe-core/playwright` runs in e2e with the WCAG 2.2 A and AA tags, and any violation fails the run.
  - The Storybook a11y addon moves from `test: "todo"` to `test: "error"`, with story tests wired into CI, so component-level violations also fail.
- **CSS cascade layers (#69):** `@layer reset, base, components, layout, features, pages;`. Common components (`components/common`), layout components (`components/layout`), feature components (`features/`) and pages (`features/*/pages`) each get their own layer, in that order, so a page or feature restyling a common component through `className` wins by layer rather than by specificity or bundle order. Why this order: the component that renders another decides where it goes, so the parent's layer sits above the child's (`GuidePage` passes `GuidePage__Top` to `GuideHeader` to pull the cover flush under the app header on phones; only the page knows that). Convention: a `className` from a parent sets only the child's outside (margin, alignment, grid or flex placement, width or size constraints), never its inside (colours, padding, typography, borders), which becomes a prop or variant on the child. `!important` stays banned, so the layer order alone decides. A Stylelint rule (`custom/enforce-css-layer`) keeps each folder in its layer. Trade-off: a component's own state styles (`[data-hovered]`, `[data-pressed]`) lose to a feature override of the same property, so the feature handles those states too.

## Browser support (#62)

- **Policy:** the last 2 versions of Chrome (desktop and Android), Edge and Firefox, plus Safari 18 or newer on iOS and macOS. It is the `browserslist` in `web/package.json`, the one source of truth. In Thailand these cover about 82% of users (`npx browserslist --coverage=TH` in `web/`).
- **Why Safari 18:** many Thai diners are on iPhones, and Safari can't be updated apart from iOS, so iOS sets the floor. iPhones get iOS updates for roughly 6 to 7 years, and the generation that stopped at iOS 18 (iPhone XS and XR) is still in use; older iPhones also tend to stay in use longer in Thailand. Supporting 18 costs almost nothing, while going lower would only add the iPhone 8 and X generation and hold TypeScript's `lib` back (below). Chromium and Firefox update themselves, so the last 2 versions is enough there.
- **Build:** `vite.config.ts` turns the browserslist into `build.target` with `browserslist-to-esbuild`. JS syntax is lowered to it, and `build.cssTarget` follows it, so Lightning CSS (Vite's CSS minifier) lowers newer CSS only as far as the oldest target needs. Everything the stylesheets use is native in Safari 18, so the built CSS keeps native nesting (`&`) and range media queries as written. `css.lightningcss.targets` isn't used: Vite reads it only when Lightning CSS also replaces PostCSS as the CSS transformer, and the CSS modules go through PostCSS.
- **Stylelint:** `plugin/no-unsupported-browser-features` (stylelint-no-unsupported-browser-features, from caniuse) checks every stylesheet against the browserslist. It reports only features a target lacks entirely (`ignorePartialSupport`): caniuse's partial-support notes don't match how the stylesheets use those properties, and every target is Safari 18+ or an evergreen browser. The few features allowed anyway (cursors, scrollbar hiding, `touch-action`, which desktop Safari lacks but has no touch input) are listed with a reason in `stylelint.config.mjs`; there are no `stylelint-disable` comments for this rule.
- **JS built-ins follow TypeScript's `lib`:** `web/tsconfig.json` has `lib: ["ES2024", "ESNext.Temporal", "DOM", "DOM.Iterable"]`, so `tsc` rejects built-ins newer than ES2024. ES2024 is the newest ES level every target fully supports (MDN browser-compat-data): its last pieces (`Object.groupBy`, `Promise.withResolvers`, `ArrayBuffer.prototype.transfer`) shipped in Safari 17.4, while ES2025 isn't complete until Safari 18.4 (Iterator helpers; `Promise.try` and `Float16Array` in 18.2). That makes `lib` the coarse check for JS built-ins. The rule: `lib` stays at the ES level the oldest browserslist target fully supports, and the two change together. Anything newer added to `lib` on purpose needs a polyfill decision, like `ESNext.Temporal`, polyfilled by `@/lib/temporal` only when `globalThis.Temporal` is missing (see Temporal, not `Date`).
- **Not checked:** web APIs. The `DOM` lib describes the latest browser APIs whatever the targets, and oxlint has no compatibility rule (`eslint-plugin-compat` isn't available), so a web API missing in Safari 18 would only show up on a real WebKit run. WebKit e2e would be that check; it is out of scope here.
- **Changing the policy:** edit the `browserslist` (and `lib` if the oldest target's ES level moves), run `pnpm build` and `pnpm lint` in `web/`, and update this section and the README.

## PWA (#43)

The web app is an installable Progressive Web App, and Guides a diner has opened reopen offline.

- **Library: `vite-plugin-pwa` with Workbox, `injectManifest` strategy.**
  - It builds the web app manifest and compiles our own worker (`web/src/sw.ts`) with the precache list injected. We picked `injectManifest` over the issue's suggested `generateSW` because the worker needs two things `generateSW` can't express:
    - photos fetched in CORS mode, so errors are visible and never cached (see below)
    - a `CACHE_URLS` warm-up through the same routes
  - React Router writes the SPA's `index.html` after Vite's bundle hooks, where the plugin builds the precache list. So `index.html` is added by hand, with a revision hashed from the hashed asset names (`indexHtmlRevision` in `web/vite.config.ts`). The root route renders every byte of `index.html`, so any change to it renames an asset. `@vite-pwa/remix` only supports Remix, not React Router 8.
  - The Workbox modules (`workbox-*` 7.4) are runtime dependencies of the worker and of the page's registration. `workbox-window` is the only one the page loads.
- **Cost.**
  - JS loaded on every page grows by about 1.5 KB gzipped (the offline copy, the toast action and the head tags).
  - The registration code (`web/src/lib/serviceWorker.ts`, with `workbox-window`) is a separate 2.5 KB gzipped chunk. It loads once the page has settled (see below).
  - `sw.js` is about 9 KB gzipped.
  - The precache is 28 files, about 980 KB raw and 380 KB gzipped: the hashed JS and CSS, the six Mali woff2 files (not the .woff fallbacks), `index.html`, the favicon and the icons. It downloads once, in the background once the page has settled, and most of it is already in the HTTP cache from the page itself.
  - Lighthouse stays at the #16 targets (median of 5): desktop 100 everywhere. Mobile Performance is 94 on the Guide Index and 91 on a Guide page, the same as before the PWA.
- **Nothing PWA-related runs before the cover paints.**
  - A static `<link rel="manifest">` cost about 2 mobile points. Chrome fetches the manifest and an icon as soon as the link exists, and Lighthouse's slow-4G simulation counts those requests before the cover paints.
  - So the page adds the link itself (`addManifestLink`) and registers the worker only once the page has settled (`whenPageSettled`). That means after `load`, after a Largest Contentful Paint for an image (the cover or the first card) or 3 s, and then after an idle moment.
  - `load` alone isn't late enough: it fires before the fonts and the cover arrive.
  - Waiting on `document.fonts.ready` was tried and dropped: it pushed FCP from 0.75 s to 1.25 s.
  - Browsers read a manifest added later when the diner installs, and Chrome's installability check passes (e2e).
  - With the link added late, both pages are back at their pre-PWA scores.
- **What is cached.**
  - The app shell is precached. Same-origin page navigations, apart from files such as `/robots.txt`, are answered with `index.html`, so every route opens offline.
  - Gateway `GET /guides` (with or without a search) and `GET /guides/{guideId}` are network-first. After 3 s, or when there's no network, the last good response is used. At most 60 entries, for 30 days.
  - Gateway `GET /photos/**` is cache-first. At most 150 entries, for 30 days, with old ones purged if the quota runs out.
    - `<img>` requests are no-cors, and their opaque responses hide the status and cost megabytes of quota each. So the worker refetches them in CORS mode: the gateway allows the web origin on every route, and the smoke test checks it on a photo.
    - If that CORS request fails, the page gets the plain response, uncached.
  - Only 200 responses are stored, never errors. Nothing from any other origin is cached: no analytics, no third parties, and not the Data Server's `:7777` photos in local dev.
- **First visit.** The first worker claims the page as soon as it activates. The page then sends it the gateway URLs it already loaded (from Resource Timing, as a `CACHE_URLS` message), so the Guide Index and Guide opened before the worker existed are cached too.
- **Updates: ask, don't force.**
  - A new deploy's worker installs and waits, and a toast says "มีเวอร์ชันใหม่" with an "อัปเดต" action. The toast has no timeout, because it has an action. Tapping it activates the new worker and reloads the page.
  - Until then the page keeps running the version it loaded, with its lazy chunks still in the old precache. When a new worker takes over, from this tab or another one, every open tab reloads into the new version, so no page asks for chunks a deploy has deleted. If the toast is closed, or replaced by another toast, it is offered again when the diner comes back to the tab. `autoUpdate` was rejected because it reloads the page under the diner without asking.
  - Browsers check `sw.js` on every page load, and the page also checks when the tab becomes visible again (installed apps stay open for days).
  - `sw.js` and `manifest.webmanifest` are served `Cache-Control: no-cache` (`web/firebase.json`, checked by the smoke test).
- **Offline state.**
  - Queries use TanStack's `networkMode: "always"`, so they run offline instead of pausing, and the worker can answer from its cache. They don't retry while `navigator.onLine` is false.
  - When nothing is cached, the existing error panel says the diner is offline (`errorPanel_offlineBody`). Its retry works once they're back online.
- **Manifest.**
  - The Thai `name` and `short_name` come from the catalog (`app_manifest_*`), with `lang: "th"`, `start_url: "/"` and `display: "standalone"`.
  - The theme colour is saffron (#f2b705) and the background is ink (#111). In the page, `theme-color` follows the theme (see Dark mode).
  - Icons are drawn from the app's own gem mark by `web/scripts/generate-icons.mjs`: 192, 512, a maskable 512 and the 180 px `apple-touch-icon`. The head also has the iOS status-bar meta.
- **Dev and tests.**
  - The worker is registered only in production builds (`import.meta.env.PROD`). `pnpm dev`, Storybook (where the plugin is disabled) and Vitest never have one, and MSW stays the only mock.
  - The PWA e2e specs (`e2e/specs/pwa.spec.ts`, projects `pwa-desktop` and `pwa-mobile`) run against `vite preview` of a production build on :4173. Its own gateway on :4300 serves the photos as the deployed one does. In the post-deploy run, they run against the live site.
  - They check:
    - the manifest and icons, with Chrome's own manifest and installability checks reporting nothing
    - that the worker registers
    - an offline reload of a visited Guide (photos included) and of the Guide Index
    - the offline error panel for an unvisited Guide
    - an axe scan in both offline states

## Dark mode

Settled in #47.

- **The system decides by default.** The app follows `prefers-color-scheme`, live. The header has an icon-only theme toggle (a monitor, sun or moon for system, light or dark) that opens a React Aria menu, built to the design canvas's "Theme toggle" board. Its accessible name and tooltip say the current theme, and it is a 48px target with the shared focus ring. On narrow phones (below 22.5rem) the header brand steps down a size, so both phone headers stay one row down to 320px; on the phone Guide header it sits between the targets, slightly off centre, as on the canvas. Truncating the brand is a last resort below 320px only.
- **Tokens, not component styles.** Every `--color-*` token that differs between themes is a `light-dark(light, dark)` pair in `globals.css`, and `color-scheme` on `:root` picks the side, so components didn't change and form controls and scrollbars match. (The same values repeated under `:root[data-theme="dark"]` and a `prefers-color-scheme` media query would behave the same, with every dark value written twice.) Stylelint rejects colour literals anywhere but `globals.css`. The dark values come from the design canvas's "Dark theme" page. Saffron stays a fill under dark text in both themes; accent-coloured text is a dark gold in light and a light saffron in dark. Toasts and the Lightbox stay white on `surface-inverse`, a raised grey in dark so they stand apart from the page. Shadows keep their light values; in dark, borders and surface steps separate things. Photos and covers render as served.
- **A saved choice wins.** It is stored per viewer in `localStorage` (`hidden-gems-theme`; "system" removes it). Every read and write is wrapped in try/catch, so blocked storage means "system", and a choice still applies until reload. Other tabs follow a change.
- **No flash of the wrong theme.** The head script from #16 starts with about 650 bytes that set `data-theme` on `<html>` before the body paints and add the `theme-color` metas. Without a saved choice, CSS alone follows the system. `<html>` suppresses the hydration warning for that attribute.
- **`theme-color`:** two `<meta name="theme-color">` tags, one per `prefers-color-scheme`: saffron in light (the PWA manifest's `theme_color`) and the dark page background `#121211` in dark. A saved choice repoints both. Meta tags can't read CSS variables, so `@/lib/theme` keeps copies, and a unit test checks them against the tokens.
- **Tests in both themes.** Storybook has a light/dark toolbar switch, and `pnpm test:storybook` runs every story and its axe scan once per theme. Playwright runs axe with `colorScheme: "dark"` on the Guide Index and a Guide page (default, filtered, Lightbox open), on desktop and mobile. The CI e2e job runs against `pnpm dev`, which serves native `light-dark()`; the production build's Lightning CSS fallback is covered by Lighthouse locally and by the post-deploy Playwright run.

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

- **GCP with Terraform**.
  - The provider repo provides the projects, the deploy identity (workload identity federation, no keys), the R2 state bucket and the zone-scoped Cloudflare token.
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
- **Test reports: Allure** (#38). Every suite writes Allure results (`allure-playwright`, `allure-vitest`, `allure-pytest`, each a dev dependency of the package that owns the suite), with a `layer` label so the report groups e2e, web unit, Storybook stories and gateway tests. Playwright keeps a failed test's trace, screenshot and video, and the report attaches them. CI combines them, after failed runs too, into one single-file report with the Allure 3 CLI, then uploads it to the provider repo's shared report host as `pr-<number>` or the branch name, with the run's GitHub OIDC token and no secret. The single-file report uploads in a few requests, well inside the token's lifetime. Test jobs alone decide pass or fail: a missing `ALLURE_REPORTS_URL` or a host that is down only warns. Test history: `allurerc.mjs` sets `historyPath` (`allure-history/history.jsonl`, the last 5 runs), and each report uploads that file with it, so each report has trends and per-test history (flaky, new, regressed). The next run reads it back through the host's API with its OIDC token: a pull request continues its own last report, or main's; a branch push its own, or main's. The report host holds it rather than the Actions cache, which evicts entries after 7 days unused; missing history only means a report without history. No retention on the host yet.

## Non-goals

- Server-side rendering and real Open Graph tags. `socialTitle` is used for `document.title` and share text only.
- Pagination, and searching restaurants across Guides. Offline, too: only Guides already opened are available (#43).
- Push notifications, background sync and app-store packaging (TWA) for the PWA.
- i18n beyond Thai: Thai only; no second locale or language switcher (see i18n above). Also user accounts and saved restaurants.
- High-contrast themes, per-Guide theming, and syncing the theme choice across devices (see Dark mode).
- Replacing or testing the provided Data Server.
