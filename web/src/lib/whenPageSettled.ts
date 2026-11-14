/** How long to wait for an image LCP before giving up (a page with no photo, a slow photo). */
const LCP_WAIT_MS = 3000;

/**
 * Resolves once the page has loaded, its largest image (the cover, or the first Guide card's)
 * has painted and the browser is idle. Work that can wait, such as the PWA manifest and service
 * worker, starts then, so its requests never compete with the first paint: the `load` event alone
 * fires before the fonts and the cover arrive. Where Largest Contentful Paint isn't reported
 * (Safari), it doesn't wait for it.
 */
export async function whenPageSettled(): Promise<void> {
  if (document.readyState !== "complete") {
    await new Promise<void>((resolve) =>
      window.addEventListener("load", () => resolve(), { once: true }),
    );
  }
  await imagePainted();
  await new Promise<void>((resolve) => {
    // Safari has no requestIdleCallback; a short delay does the same job there.
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: 3000 });
    } else {
      setTimeout(resolve, 500);
    }
  });
}

/** A Largest Contentful Paint entry for an image (it has a `url`), or LCP_WAIT_MS. */
function imagePainted(): Promise<void> {
  return new Promise((resolve) => {
    if (
      typeof PerformanceObserver === "undefined" ||
      !PerformanceObserver.supportedEntryTypes?.includes(
        "largest-contentful-paint",
      )
    ) {
      resolve();
      return;
    }
    const observer = new PerformanceObserver((list) => {
      if (list.getEntries().some((entry) => "url" in entry && entry.url)) {
        done();
      }
    });
    const timer = setTimeout(done, LCP_WAIT_MS);
    function done() {
      clearTimeout(timer);
      observer.disconnect();
      resolve();
    }
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  });
}
