/**
 * Makes sure `Temporal` exists before anything renders. Chrome, Edge and Firefox ship it;
 * Safari (iOS included) doesn't yet, so there, and only there, this downloads
 * `temporal-polyfill` (about 20 KB gzipped) and installs it as the global `Temporal`.
 * Drop it once Safari ships Temporal.
 */
export async function ensureTemporal(): Promise<void> {
  if (typeof globalThis.Temporal === "undefined") {
    await import("@/lib/temporalPolyfill");
  }
}
