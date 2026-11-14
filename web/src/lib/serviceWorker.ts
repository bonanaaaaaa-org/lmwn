import { Workbox } from "workbox-window";

import { env } from "@/lib/env";

export interface ServiceWorkerOptions {
  /**
   * A new deploy's worker is installed and waiting. `update` lets it take over and reloads the
   * page into the new version; until then the page keeps running the version it loaded.
   */
  onUpdateReady: (update: () => void) => void;
}

/**
 * The gateway requests this page already made (the Guide Index or Guide data and the photos),
 * from Resource Timing. The first worker isn't controlling the page while those load, so the page
 * hands them over to be cached; the worker ignores any URL it has no route for.
 */
export function loadedGatewayUrls(
  entries: readonly Pick<PerformanceEntry, "name">[],
  apiBaseUrl: string = env.apiBaseUrl,
): string[] {
  const prefix = `${apiBaseUrl}/`;
  return [
    ...new Set(
      entries
        .map((entry) => entry.name)
        .filter((name) => name.startsWith(prefix)),
    ),
  ];
}

/**
 * Registers `/sw.js` (built from `src/sw.ts`) and wires its lifecycle to the page: production
 * builds only, after the page has loaded, so the worker and its precache never compete with the
 * first paint (see app/root.tsx).
 */
export function registerServiceWorker({
  onUpdateReady,
}: ServiceWorkerOptions): void {
  const workbox = new Workbox("/sw.js");

  // The first install: the worker claims this page, then caches what the page already loaded.
  workbox.addEventListener("controlling", (event) => {
    if (event.isUpdate) return;
    const urlsToCache = loadedGatewayUrls(
      performance.getEntriesByType("resource"),
    );
    if (urlsToCache.length > 0) {
      void workbox.messageSW({ type: "CACHE_URLS", payload: { urlsToCache } });
    }
  });

  // A new deploy (found now or on a later check) waits for the diner's go-ahead.
  workbox.addEventListener("waiting", () => {
    onUpdateReady(() => {
      workbox.addEventListener("controlling", () => window.location.reload());
      workbox.messageSkipWaiting();
    });
  });

  void workbox.register();

  // The browser checks for a new sw.js on each page load; a diner who keeps the tab open (an
  // installed app often stays open for days) also gets a check whenever they come back to it.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void workbox.update();
  });
}
