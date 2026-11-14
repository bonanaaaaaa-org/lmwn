import { http, HttpResponse } from "msw";
import { z } from "zod";

import { fetchJson } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { GUIDE_COVER_SIZES } from "@/lib/coverSizes";
import {
  matchPreloadPage,
  preloadPageScript,
  takePreloadedResponse,
} from "@/lib/preloadPageData";
import { server } from "@/test-utils/server";

const API = "http://api.test";
const GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";
const PRELOAD_GLOBAL = "__hiddenGemsPreload";

/** The global the head script leaves its response in. */
const slot = () => window as unknown as Record<string, unknown>;

function links() {
  return [...document.head.querySelectorAll("link")].map((link) => ({
    rel: link.rel,
    href: link.getAttribute("href"),
    as: link.getAttribute("as"),
    imagesrcset: link.getAttribute("imagesrcset"),
    imagesizes: link.getAttribute("imagesizes"),
    fetchpriority: link.getAttribute("fetchpriority"),
  }));
}

function runScript(path: string, assets = {}) {
  window.history.replaceState(null, "", path);
  // The script is inlined into index.html; run it the same way, as plain source.
  new Function(preloadPageScript(API, assets))();
}

afterEach(() => {
  document.head.querySelectorAll("link").forEach((link) => link.remove());
  delete slot()[PRELOAD_GLOBAL];
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

describe("matchPreloadPage", () => {
  it("maps the Guide Index to the unfiltered Guide list", () => {
    expect(matchPreloadPage("/", API)).toEqual({
      page: "guideIndex",
      dataUrl: `${API}/guides`,
    });
  });

  it("maps a Guide page to its Guide", () => {
    expect(matchPreloadPage(`/guides/${GUIDE_ID}`, API)).toEqual({
      page: "guide",
      dataUrl: `${API}/guides/${GUIDE_ID}`,
    });
    expect(matchPreloadPage(`/guides/${GUIDE_ID}/`, API)?.page).toBe("guide");
  });

  it("ignores other paths and Guide IDs that aren't UUID-shaped", () => {
    expect(matchPreloadPage("/about", API)).toBeUndefined();
    expect(matchPreloadPage("/guides/not-a-guide", API)).toBeUndefined();
    expect(matchPreloadPage(`/guides/${GUIDE_ID}/extra`, API)).toBeUndefined();
  });
});

describe("preloadPageScript", () => {
  it("requests the page data and preloads the route code", () => {
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchSpy);

    runScript(`/guides/${GUIDE_ID}`, {
      guide: ["/assets/guide.js", "/assets/guide.css"],
      guideIndex: ["/assets/index.js"],
    });

    expect(fetchSpy).toHaveBeenCalledWith(`${API}/guides/${GUIDE_ID}`, {
      headers: { Accept: "application/json" },
    });
    expect(links()).toEqual([
      expect.objectContaining({
        rel: "modulepreload",
        href: "/assets/guide.js",
      }),
      expect.objectContaining({
        rel: "preload",
        href: "/assets/guide.css",
        as: "style",
      }),
    ]);
  });

  it("preloads the Guide's cover with the page's candidates and sizes once the data arrives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          coverPhoto: {
            smallUrl: "http://img.test/r/854/480/cover.jpg",
            largeUrl: "http://img.test/r/1920/1080/cover.jpg",
          },
        }),
      ),
    );

    runScript(`/guides/${GUIDE_ID}`);

    await vi.waitFor(() =>
      expect(links()).toContainEqual(
        expect.objectContaining({
          rel: "preload",
          as: "image",
          imagesrcset:
            "http://img.test/r/854/480/cover.jpg 854w, http://img.test/r/1920/1080/cover.jpg 1920w",
          imagesizes: GUIDE_COVER_SIZES,
          fetchpriority: "high",
        }),
      ),
    );
  });

  it("doesn't preload a cover on a filtered Guide Index, whose first Guide may differ", async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({
        items: [{ coverPhoto: { smallUrl: "a", largeUrl: "b" } }],
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    runScript("/?tag=cafe");
    await Promise.resolve();
    await new Promise((done) => setTimeout(done, 0));

    expect(fetchSpy).toHaveBeenCalledWith(`${API}/guides`, expect.anything());
    expect(links().filter((link) => link.as === "image")).toEqual([]);
  });

  it("adds nothing on a path with no page request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    runScript("/somewhere");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(links()).toEqual([]);
  });
});

describe("takePreloadedResponse", () => {
  it("hands the preloaded response to the first caller for that URL only", async () => {
    const response = Promise.resolve(new Response("{}"));
    slot()[PRELOAD_GLOBAL] = {
      url: `${API}/guides`,
      response,
    };

    expect(takePreloadedResponse(`${API}/guides/other`)).toBeUndefined();
    expect(takePreloadedResponse(`${API}/guides`)).toBe(response);
    expect(takePreloadedResponse(`${API}/guides`)).toBeUndefined();
  });
});

describe("fetchJson with a preloaded response", () => {
  const schema = z.object({ id: z.string() });
  const url = `${env.apiBaseUrl}/guides/g1`;

  it("uses the preloaded response instead of asking the gateway again", async () => {
    let gatewayCalls = 0;
    server.use(
      http.get(url, () => {
        gatewayCalls += 1;
        return HttpResponse.json({ id: "from-gateway" });
      }),
    );
    slot()[PRELOAD_GLOBAL] = {
      url,
      response: Promise.resolve(Response.json({ id: "preloaded" })),
    };

    await expect(fetchJson("/guides/g1", schema)).resolves.toEqual({
      id: "preloaded",
    });
    // A refetch reaches the gateway.
    await expect(fetchJson("/guides/g1", schema)).resolves.toEqual({
      id: "from-gateway",
    });
    expect(gatewayCalls).toBe(1);
  });

  it("reports a preloaded error response as an ApiError, and the retry reaches the gateway", async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: "recovered" })));
    slot()[PRELOAD_GLOBAL] = {
      url,
      response: Promise.resolve(
        Response.json({ detail: "Upstream failed" }, { status: 502 }),
      ),
    };

    await expect(fetchJson("/guides/g1", schema)).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      detail: "Upstream failed",
    });
    await expect(fetchJson("/guides/g1", schema)).resolves.toEqual({
      id: "recovered",
    });
  });

  it("asks the gateway itself when the preloaded request failed", async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: "retried" })));
    const failed = Promise.reject(new TypeError("Failed to fetch"));
    failed.catch(() => {});
    slot()[PRELOAD_GLOBAL] = { url, response: failed };

    await expect(fetchJson("/guides/g1", schema)).resolves.toEqual({
      id: "retried",
    });
  });
});
