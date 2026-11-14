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
  let registration: ServiceWorkerRegistration | undefined;

  // The first install: the worker claims this page, then caches what the page already loaded.
  // An update: a new worker took over (from this tab's toast or another tab's), and its
  // precache no longer holds this page's lazy chunks, so reload into the new version.
  workbox.addEventListener("controlling", (event) => {
    if (event.isUpdate) {
      window.location.reload();
      return;
    }
    const urlsToCache = loadedGatewayUrls(
      performance.getEntriesByType("resource"),
    );
    if (urlsToCache.length > 0) {
      void workbox.messageSW({ type: "CACHE_URLS", payload: { urlsToCache } });
    }
  });

  // The new worker activates; "controlling" above then reloads. If another tab already
  // activated it, there's nothing waiting any more: just reload.
  const update = () => {
    if (registration?.waiting) workbox.messageSkipWaiting();
    else window.location.reload();
  };

  // A new deploy (found now or on a later check) waits for the diner's go-ahead.
  workbox.addEventListener("waiting", () => onUpdateReady(update));

  // Registration can fail where workers or storage are blocked (some private modes, policies,
  // automation): the app then simply runs without offline support.
  workbox
    .register()
    .then((registered) => {
      registration = registered;
    })
    .catch(() => {});

  // The browser checks for a new sw.js on each page load; a diner who keeps the tab open (an
  // installed app often stays open for days) also gets a check whenever they come back to it.
  // If an update is still waiting (its toast was closed or replaced), it is offered again.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (registration?.waiting) onUpdateReady(update);
    // Offline, the check fails; the next visit tries again.
    workbox.update().catch(() => {});
  });
}
