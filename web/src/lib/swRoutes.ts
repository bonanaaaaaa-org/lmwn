/**
 * Which requests the service worker (`src/sw.ts`) handles. Pure functions, so the rules are
 * unit-tested without a worker. Anything none of these match is left to the network.
 */

/** Gateway JSON for the Guide Index and Guides (network-first). */
export const GATEWAY_CACHE = "gateway-guides";
/** Gateway photos (cache-first, bounded). */
export const PHOTO_CACHE = "gateway-photos";

/** The gateway path under `apiBaseUrl` for `url`, or `undefined` for any other origin or path. */
function gatewayPath(url: URL, apiBaseUrl: string): string | undefined {
  const base = new URL(apiBaseUrl);
  if (url.origin !== base.origin) return undefined;
  const prefix = base.pathname.replace(/\/+$/, "");
  if (prefix && !url.pathname.startsWith(`${prefix}/`)) return undefined;
  return url.pathname.slice(prefix.length);
}

/**
 * `GET /guides` (the Guide Index, with or without a search) and `GET /guides/{guideId}` on the
 * gateway. Not the gateway's other routes, and not any other origin.
 */
export function isGatewayGuidesRequest(
  method: string,
  url: URL,
  apiBaseUrl: string,
): boolean {
  if (method !== "GET") return false;
  const path = gatewayPath(url, apiBaseUrl);
  return path !== undefined && /^\/guides(?:\/[^/]+)?\/?$/.test(path);
}

/** `GET /photos/**` on the gateway (deployed, it serves the Data Server's photos). */
export function isGatewayPhotoRequest(
  method: string,
  url: URL,
  apiBaseUrl: string,
): boolean {
  if (method !== "GET") return false;
  return gatewayPath(url, apiBaseUrl)?.startsWith("/photos/") ?? false;
}

/**
 * A same-origin page navigation the SPA shell answers: every route, but not a file such as
 * `/robots.txt` or anything under `/assets/`.
 */
export function isShellNavigation(
  mode: RequestMode,
  url: URL,
  origin: string = globalThis.location.origin,
): boolean {
  if (mode !== "navigate" || url.origin !== origin) return false;
  if (url.pathname.startsWith("/assets/")) return false;
  const lastSegment = url.pathname.split("/").pop() ?? "";
  return !lastSegment.includes(".");
}
