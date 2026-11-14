---
github_project: "https://github.com/orgs/bonanaaaaaa-org/projects/7"
parent_issue: "https://github.com/bonanaaaaaa-org/lmwn/issues/3"
related_adrs: []
context_terms:
  - Guide
  - Guide Index
  - Guide Item
  - Tag
  - Restaurant
  - Category
  - Rating
  - Unrated Restaurant
  - Working Hours
  - Open Now
  - Unavailable Restaurant
issues:
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/4"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/5"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/6"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/7"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/8"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/9"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/10"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/11"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/12"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/13"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/14"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/15"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/16"
  - "https://github.com/bonanaaaaaa-org/lmwn/issues/17"
---

# Guide to Hidden Gems

## Problem

Diners want to find restaurants that fit a specific need, such as a trip, a trending drink or a large group. LMWN editors write themed **Guides** for this, but the data is spread across separate upstream services that the browser can't reach directly. They only return IDs and raw records, with no search. We need an API gateway that combines them into one safe, stable contract, and a web app that makes Guides easy to find, read and act on.

Source: the LMWN Frontend Assignment 2025 brief and the design interview recorded in [design-decisions.md](../design-decisions.md).

## Users

- **Diner**: anyone browsing the Guide Index or reading a Guide, on a phone or desktop, usually in Thai.
- **Assignment reviewer**: runs the stack locally and judges correctness, UX, code quality, performance and security.

## Acceptance criteria

Everything is **required** unless marked _Deferred_.

### Guide Index

- **Given** the gateway returns Guides, **when** a diner opens `/`, **then** each Guide appears as a card with cover image, title, shortDescription, Tags and restaurant count ("10 ร้าน", "10 restaurants"), and the whole card links to the Guide.
- **Given** the Guide Index, **when** the diner types in the search box, **then** after they stop typing (or press Enter) only Guides whose title, shortDescription or Tags contain the text are listed, ignoring case. Thai text matches inside words (searching "คาเฟ่", "café", matches "คาเฟ่ลับ", "hidden café").
- **Given** a search is loading, **when** results arrive, **then** the previous results stay visible until then (the list never blanks out), and a count shows "พบ N ไกด์" (N guides found).
- **Given** a diner clicks a Tag on any page, **when** the Guide Index opens, **then** it shows only Guides with that Tag. Several Tags must all match, and a Tag combines with search text.
- **Given** search or Tag filters are set, **when** the diner reloads, shares the URL or presses Back, **then** the same filtered view is restored.
- **Given** nothing matches, **then** an empty state explains it and offers to clear the search.

### Guide page: header

- **Given** a valid Guide, **when** the diner opens `/guides/:guideId`, **then** they see:
  - the title
  - the Tags, as links
  - a large cover image
  - the full description
  - the date it was written, in Thai format (e.g. "10 มี.ค. 2567", 10 March 2024 in the Buddhist calendar)
- **And** the browser tab title is the Guide's socialTitle.
- **When** the diner uses the share button for the whole Guide, **then** the device share sheet opens with the Guide link and socialTitle. Where sharing isn't supported, the link is copied and a confirmation toast appears.

### Guide page: restaurant cards

- **Given** a Guide, **then** its Guide Items appear in the editor's order. Each card shows:
  - photos in a strip that snaps to each photo: 3 visible on desktop, about 1.2 on a phone with the next photo peeking in
  - the Restaurant name and branch, e.g. "ONIBUS COFFEE (สาขา X)" (branch X)
  - the Rating and review count ("4.3 · 6 รีวิว", "6 reviews"), read out as "4.3 จาก 5 ดาว" (4.3 out of 5 stars)
  - the Categories
  - today's hours with an Open Now or closed badge, plus the full week in an expandable section
  - the Guide Item's write-up, cut to about 4 lines with "อ่านเพิ่มเติม" (read more) to expand
  - the address with a "ดูแผนที่" (view map) link to Google Maps at the Restaurant's location
  - the phone number as a tappable call link
  - LINE, Instagram and Facebook links, each shown only when the Restaurant has one
  - a link to the Restaurant on Wongnai
  - delivery, pickup and official badges where they apply
- **Given** an Unrated Restaurant, **then** the card shows "ยังไม่มีรีวิว" (no reviews yet) instead of stars.
- **When** the diner taps a photo, **then** a lightbox opens on that photo, covering the whole screen at every size with the photo as large as fits without cropping. It can be swiped, used with the keyboard (arrows, Esc) and closed, and focus returns to the photo afterwards.
- **When** the diner shares a card, **then** the shared link opens that Guide, scrolls to the card and briefly highlights it. The share text includes the Restaurant name and Guide title. Without native sharing, the link is copied with a toast.

### Guide page: filtering and sorting

- **Given** a Guide, **then** the diner can filter by:
  - one or more Categories (taken from that Guide's Restaurants)
  - Open Now
  - delivery
  - pickup
- **And** they can sort by guide order (the default) or by Rating, with Unrated Restaurants last.
- **Given** filters are set, **then** a count shows "N of M" and the state is kept in the URL.
- **Given** nothing matches, **then** an empty state offers "ล้างตัวกรอง" (clear filters).
- **Given** a Restaurant-based filter is on, **then** Unavailable Restaurants are hidden. With no such filter on, they're shown.

### Open Now

- **Given** a Restaurant's Working Hours, **then** Open Now is judged in Thailand time, whatever the viewer's own time zone.
- **Given** hours that run past midnight (e.g. 18:00–02:00 on Monday), **then** the Restaurant counts as open at 01:00 on Tuesday.
- **Given** a day missing from the Working Hours, **then** the Restaurant is closed all that day.
- **Given** the page stays open across an opening or closing time, **then** Open Now reflects the current time, not the time the data was loaded.

### Gateway contract

- **Given** `GET /guides`, **then** it returns `{ items, total }` with a summary for every Guide. `q` and repeated `tag` filter it as described in the Guide Index criteria.
- **Given** `GET /guides/{guideId}`, **then** it returns the Guide with every Guide Item and its Restaurant, in guide order, in one response.
- **Given** a request for an unknown guide, or for an ID that isn't UUID-shaped, **then** the response is 404 `{detail}`. A malformed ID never reaches upstream.
- **Given** `q` longer than 100 characters, **then** the response is 422.
- **Given** an upstream timeout, **then** 504. **Given** an upstream server error or a malformed upstream body, **then** 502. Error bodies never expose upstream URLs, stack traces or raw payloads.
- **Given** a Restaurant can't be loaded, **then** the Guide still returns, with that Guide Item marked as an Unavailable Restaurant. **Given** the Guide or a Guide Item can't be loaded, **then** the whole request fails.
- **Then** responses never contain storage internals (`_id`, `__v`), and optional fields that are absent upstream stay absent.
- **Then** responses can be cached for 60 seconds, and repeat requests within that window don't call upstream again.

### Failure and loading states (web)

- **While** data loads, **then** a skeleton that matches the page layout is shown, never a bare spinner.
- **Given** a 404, **then** a "ไม่พบไกด์นี้" (guide not found) page links back to the Guide Index.
- **Given** a network error, 5xx or 504, **then** the request is retried automatically up to 2 times (never on a 404). After that, an error panel offers "ลองใหม่" (try again).
- **Given** an Unavailable Restaurant, **then** its card keeps the write-up and photos and says "ไม่สามารถโหลดข้อมูลร้านได้" (couldn't load restaurant details).
- **Given** an image fails or is empty, **then** a placeholder of the same size replaces it, and the layout doesn't move.

### Accessibility

- **Then** text and controls meet WCAG 2.2 AA contrast. Every interactive element can be reached by keyboard and has a visible focus ring.
- **Given** `prefers-reduced-motion`, **then** smooth scrolling, the share highlight animation and lightbox transitions are turned off.
- **Then** the cover image's alt text is the Guide title, and photos are described as "รูปที่ n จาก m ของ {Restaurant}" (photo n of m of {Restaurant}).
- **Given** an automated axe scan, **when** it runs on the Guide Index and a Guide page at desktop and phone sizes, **then** it reports zero violations (WCAG 2.2 A and AA rules) in each of these states:
  - default
  - search or filters applied
  - empty results
  - lightbox open
  - 404
  - error panel
  - Unavailable Restaurant card

## Edge cases

- **Empty and loading:** no Guides, no search matches, no filter matches, a Guide with zero Guide Items (show an empty state), skeletons while loading.
- **Mid-flow failure:** one Restaurant fails (Unavailable Restaurant); the Guide or a Guide Item fails (error panel with retry); a search request fails while earlier results are on screen (keep the results and show a retry message inline).
- **Persistence:** all view state lives in the URL. Nothing is stored in the browser beyond the HTTP and query caches.
- **Permissions:** N/A. There are no accounts or protected content.
- **Boundary inputs:**
  - Thai search text written with combining characters in a different order (NFC normalisation)
  - whitespace-only search text (treated as empty)
  - search text of 100 characters (allowed) vs 101 (rejected)
  - a guide ID with `../` or `?` in it (404)
  - a share link with an unknown `#item-` (the page opens normally and doesn't scroll)
  - Rating 0 with 0 reviews (Unrated)
  - write-ups from 14 to 958 characters
  - 1 to 8 photos
  - Restaurants with no branch or social accounts
  - a week with only 5 days of hours
  - hours that run past midnight
- **Concurrent and repeated actions:** fast typing sends only the latest search, and stale responses never replace newer results. Pressing share or retry repeatedly is safe. Several tabs don't interfere with each other.

## Measurable success criteria

| Criterion | Target | Verification |
| --- | --- | --- |
| Every required acceptance criterion above | Met | Playwright e2e (desktop and phone) plus unit tests |
| Gateway test coverage | ≥ 90% (an existing CI gate) | `pnpm --filter api-gateway test` |
| Gateway error mapping | Each status above has a test, including partial Restaurant failure | pytest with respx fixtures |
| Web behaviour | Guide Index search, Guide page rendering, filters, Open Now (including past midnight and Thailand time), and every failure state have unit tests | Vitest + Testing Library + MSW |
| Component catalogue | Every component has a Storybook story | `pnpm build-storybook` in CI |
| Accessibility (pages) | Zero axe violations, of any impact level, against the WCAG 2.2 A and AA rules, in every state listed under Accessibility | axe scans in Playwright e2e, desktop and phone |
| Accessibility (components) | Zero axe violations in every Storybook story | Storybook a11y addon set to fail on violations, run in CI |
| Lighthouse | 100 in Performance, Accessibility, Best Practices and SEO, on both the Guide Index and a Guide page, with both mobile and desktop presets, except mobile Performance: 90 or more (median of 5 runs) | `pnpm lighthouse`: Lighthouse against the production build (`pnpm build` + preview) with the full stack running |

## Non-goals

- Server-side rendering and real Open Graph link previews (`socialTitle` is used for the tab title and share text only).
- Pagination, and searching restaurants across Guides (deferred until there are enough Guides to need it).
- A database, user accounts, and saved or favourite restaurants. The PWA's offline copy of Guides already opened (#43) is a cache, not a saved list: the diner can't choose what it keeps.
- For the PWA: push notifications, background sync, app-store packaging (TWA), and offline access to Guides never opened.
- i18n beyond Thai: Thai only; no second locale or language switcher (UI copy still lives in one catalog behind an i18n layer). Dark mode.
- Replacing, modifying or testing the provided Data Server.
- LINE MAN or Wongnai branding.

## Assumptions, dependencies and open questions

- **Dependency:** the provided Data Server (`lmwn-assignment-2025-server`) runs as published. Its quirks (unknown IDs return `null`, storage internals in responses, no CORS) are documented in [design-decisions.md](../design-decisions.md).
- **Existing work:** the repo has the scaffold only (a health endpoint, an API client, providers and an empty home route). Every capability in this spec is new work.
- **Assumption:** the sample data (2 Guides, all about One Bangkok) can't satisfy the brief's Kanchanaburi or matcha examples. Those examples show the intent; they aren't test cases.
- **Assumption:** total budget is about 12–16 hours. Optional polish beyond this spec is decided case by case.
- **Risk (resolved in #16):** Lighthouse Performance 100 on mobile turned out out of reach for this stack. The mobile preset simulates a mid-range phone on slow 4G, where every byte that finishes before the cover paints counts against LCP; 100 needs LCP under about 1.85 s, so about 220 KB for JS, CSS, fonts, data and the cover together, while React, React Router, React Aria, TanStack Query and zod alone are about 250 KB gzipped and the Mali font about 100 KB. Closing the gap would mean server rendering (a non-goal) or dropping React Aria or Mali. The mobile target is therefore 90 or more; desktop stays at 100. The page still serves the small image to phones, preloads the page's data, route code and cover from the document head, and keeps below-the-fold photos from competing with the cover.
