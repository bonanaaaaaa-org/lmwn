import { GUIDE_CARD_SIZES, GUIDE_COVER_SIZES } from "@/lib/coverSizes";

/** The pages whose first request, code and cover the document head starts early. */
export type PreloadPage = "guideIndex" | "guide";

/**
 * The page at `pathname` and the gateway request it makes first: the Guide Index (`/`)
 * needs `GET /guides` (the unfiltered list, which also holds every Tag), a Guide page
 * (`/guides/:guideId`) needs `GET /guides/:guideId`. Other paths, and Guide IDs that are not
 * UUID-shaped (the gateway 404s those), return `undefined`.
 *
 * Must stay self-contained (no imports, no outer variables): it is also inlined into the HTML
 * as a script (see `preloadPageScript`).
 */
export function matchPreloadPage(
  pathname: string,
  apiBaseUrl: string,
): { page: PreloadPage; dataUrl: string } | undefined {
  if (pathname === "/") {
    return { page: "guideIndex", dataUrl: apiBaseUrl + "/guides" };
  }
  const guide =
    /^\/guides\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/?$/i.exec(
      pathname,
    );
  return guide
    ? { page: "guide", dataUrl: apiBaseUrl + "/guides/" + guide[1] }
    : undefined;
}

/** Each page's route code (JS modules and stylesheets), from the build manifest. */
export type PreloadPageAssets = Partial<Record<PreloadPage, readonly string[]>>;

/** Where the head script leaves its in-flight gateway response for the app to pick up. */
const PRELOAD_GLOBAL = "__hiddenGemsPreload";

interface PreloadedResponse {
  url: string;
  response: Promise<Response>;
}

type PreloadWindow = Window & { [PRELOAD_GLOBAL]?: PreloadedResponse };

/**
 * The response the head script already requested for `url`, once: the first caller gets it
 * and later callers fetch for themselves (a refetch must reach the gateway).
 */
export function takePreloadedResponse(
  url: string,
): Promise<Response> | undefined {
  if (typeof window === "undefined") return undefined;
  const preloadWindow = window as PreloadWindow;
  const preloaded = preloadWindow[PRELOAD_GLOBAL];
  if (!preloaded || preloaded.url !== url) return undefined;
  delete preloadWindow[PRELOAD_GLOBAL];
  return preloaded.response;
}

/**
 * A script for the document head that, for the page in the address bar:
 * 1. requests its gateway data (handed to the app through `takePreloadedResponse`),
 * 2. preloads its route code (`modulepreload`, and `preload` for stylesheets), and
 * 3. once the data arrives, preloads the page's cover (its LCP image) at high priority.
 *
 * Otherwise the route code waits for the entry JavaScript, the request waits for the route
 * code and the cover waits for React to render: three round trips in a row before the
 * cover can paint. The cover uses the same candidates and `sizes` as the page, so the
 * browser picks the same file. The Guide Index's cover is the first Guide's, so it is only
 * preloaded without a search or Tag in the URL. A path with no known page adds nothing.
 */
export function preloadPageScript(
  apiBaseUrl: string,
  assets: PreloadPageAssets,
): string {
  const sizes = { guideIndex: GUIDE_CARD_SIZES, guide: GUIDE_COVER_SIZES };
  return `(function(){var match=(${matchPreloadPage.toString()})(location.pathname,${JSON.stringify(apiBaseUrl)});if(!match)return;function add(rel,href,attrs){var link=document.createElement("link");link.rel=rel;if(href)link.href=href;for(var k in attrs)link.setAttribute(k,attrs[k]);document.head.appendChild(link)}var files=${JSON.stringify(assets)}[match.page]||[];for(var i=0;i<files.length;i++){if(/\\.css$/.test(files[i]))add("preload",files[i],{as:"style"});else add("modulepreload",files[i])}var response=fetch(match.dataUrl,{headers:{Accept:"application/json"}});window.${PRELOAD_GLOBAL}={url:match.dataUrl,response:response};if(match.page==="guideIndex"&&location.search)return;response.then(function(r){return r.ok?r.clone().json():null}).then(function(data){var photo=data&&(match.page==="guide"?data.coverPhoto:data.items&&data.items[0]&&data.items[0].coverPhoto);if(!photo)return;function width(url,fallback){var m=/\\/r\\/(\\d+)\\/\\d+\\//.exec(url);return m?m[1]:fallback}var set=[];if(photo.smallUrl&&photo.smallUrl.trim())set.push(photo.smallUrl+" "+width(photo.smallUrl,480)+"w");if(photo.largeUrl&&photo.largeUrl.trim())set.push(photo.largeUrl+" "+width(photo.largeUrl,1080)+"w");if(!set.length)return;add("preload",null,{as:"image",imagesrcset:set.join(", "),imagesizes:${JSON.stringify(sizes)}[match.page],fetchpriority:"high"})}).catch(function(){})})()`;
}
