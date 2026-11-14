/**
 * Whether the browser knows it has no network (`navigator.onLine` is false). Only "false" is
 * reliable (true can mean a network without internet), so it explains a failure; it never
 * skips a request. Without a DOM it reports online.
 */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
