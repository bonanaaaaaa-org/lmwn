/// <reference lib="webworker" />
/**
 * The service worker (#43), built by vite-plugin-pwa (`injectManifest`) into `/sw.js`.
 *
 * - Precaches the app shell: the hashed `/assets/**` JS, CSS and Mali woff2 files, `index.html`,
 *   the favicon and the app icons (the list is injected at build time as `__WB_MANIFEST`).
 * - Navigations fall back to the precached `index.html`, so every route opens offline.
 * - The gateway's `GET /guides` and `GET /guides/{guideId}` are network-first with a short
 *   timeout, falling back to the last good response, so Guides the diner opened open offline.
 * - The gateway's photos are cache-first, bounded by entry count and age.
 * - Nothing else is cached: other origins (and other gateway routes) go straight to the network.
 *   Only 200 responses are stored, never errors.
 *
 * A new version waits until the page asks it to take over (the update toast), so a page never
 * runs against a newer deploy's files. The first version claims the open page at once, and the
 * page then sends the gateway URLs it already loaded (`CACHE_URLS`), so the Guide Index and the
 * Guide the diner opened before the worker existed are cached too.
 */
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim, type WorkboxPlugin } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { Route, Router } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

import { env } from "./lib/env";
import {
  GATEWAY_CACHE,
  isGatewayGuidesRequest,
  isGatewayPhotoRequest,
  isShellNavigation,
  PHOTO_CACHE,
} from "./lib/swRoutes";

declare const self: ServiceWorkerGlobalScope;

const DAY_SECONDS = 24 * 60 * 60;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

/** Runtime routes; their own router so the page's `CACHE_URLS` message runs through them too. */
const router = new Router();

router.registerRoute(
  new Route(
    ({ request, url }) => isShellNavigation(request.mode, url),
    createHandlerBoundToURL("/index.html"),
  ),
);

/** Only a complete 200 is worth keeping; errors and empty bodies never are. */
const okOnly = new CacheableResponsePlugin({ statuses: [200] });

const guides = new Route(
  ({ request, url }) =>
    isGatewayGuidesRequest(request.method, url, env.apiBaseUrl),
  new NetworkFirst({
    cacheName: GATEWAY_CACHE,
    // On a poor connection, the last good response after 3 s beats a spinner.
    networkTimeoutSeconds: 3,
    plugins: [
      okOnly,
      // The Guide Index, each Guide opened and recent searches: a few dozen small JSON bodies.
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * DAY_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);
router.registerRoute(guides);

/**
 * `<img>` and image preloads ask for photos without CORS, which gives an opaque response: its
 * status is hidden, so an error can't be told apart from a photo, and Chrome counts each one as
 * megabytes of quota. The gateway answers CORS for the web app's origin, so the worker asks in
 * `cors` mode instead and can keep only real 200s.
 */
const corsPhotoRequest: WorkboxPlugin = {
  requestWillFetch: async ({ request }) =>
    request.mode === "no-cors"
      ? // `reload`: the HTTP cache may hold this photo from the page's own no-cors request,
        // stored without CORS headers (the gateway sends no `Vary: Origin`), which would fail
        // the CORS check. Fetch it fresh, and refresh that entry with CORS headers.
        new Request(request.url, {
          mode: "cors",
          credentials: "omit",
          cache: "reload",
        })
      : request,
  // If that CORS request fails (offline, or an origin the gateway doesn't allow), hand the
  // page the plain request's result, uncached, rather than a broken image.
  handlerDidError: async ({ request }) => fetch(request),
};

const photos = new Route(
  ({ request, url }) =>
    isGatewayPhotoRequest(request.method, url, env.apiBaseUrl),
  new CacheFirst({
    cacheName: PHOTO_CACHE,
    plugins: [
      corsPhotoRequest,
      okOnly,
      // About 150 photos, from a few Guides' covers, strips and lightbox views.
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 30 * DAY_SECONDS,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);
router.registerRoute(photos);

router.addFetchListener();
// `{ type: "CACHE_URLS", payload: { urlsToCache } }`: each URL a route matches is fetched and
// cached through that route; any other URL is ignored.
router.addCacheListener();

// The page's update toast posts this when the diner chooses to reload into the new version.
self.addEventListener("message", (event) => {
  if (
    typeof event.data === "object" &&
    event.data !== null &&
    "type" in event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    void self.skipWaiting();
  }
});
