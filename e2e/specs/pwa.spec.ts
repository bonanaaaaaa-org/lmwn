import { expect, type Page, test } from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { message } from "#support/messages";

// The installable PWA (#43). The service worker exists only in a production build, so these specs
// run in the `pwa-*` projects (playwright.config.ts): against `vite preview` of a build whose
// gateway serves the photos, as when deployed, or against the deployed site itself.
const GATEWAY =
  process.env.PWA_API_BASE_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:4300";

const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb"; // "10 คาเฟ่ลับ One Bangkok!"
const OTHER_GUIDE_ID = "34c790dd-123b-499b-ba55-ea2f5befb452";

interface Manifest {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

/** Waits until the service worker controls the page (the first one claims it once active). */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, {
        once: true,
      }),
    );
  });
}

/** The URLs in the worker's runtime caches (not the precache). */
async function cachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      if (name.startsWith("workbox-precache")) continue;
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });
}

/** Whether every `<img>` matching `selector` that has started loading shows a decoded image. */
async function imagesLoaded(page: Page, selector: string): Promise<boolean> {
  return page
    .locator(selector)
    .evaluateAll((images) =>
      images.every(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    );
}

test.describe("PWA", () => {
  test("is installable: a valid manifest with icons and a registered service worker", async ({
    page,
    request,
    browserName,
  }) => {
    await page.goto("/");

    // The page links the manifest once it has settled, not in the HTML (see addManifestLink).
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as Manifest;
    expect(manifest).toMatchObject({
      lang: "th",
      start_url: "/",
      display: "standalone",
      theme_color: "#f2b705",
      background_color: "#111111",
    });
    expect(manifest.name).toMatch(/[฀-๿]/);
    expect(manifest.short_name).toMatch(/[฀-๿]/);
    const icons = manifest.icons.map(
      (icon) => `${icon.sizes} ${icon.purpose ?? "any"}`,
    );
    expect(icons).toEqual(
      expect.arrayContaining([
        "192x192 any",
        "512x512 any",
        "512x512 maskable",
      ]),
    );
    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.headers()["content-type"], icon.src).toBe(icon.type);
    }
    const appleIcon = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute("href");
    expect((await request.get(appleIcon ?? "")).ok()).toBe(true);

    await waitForServiceWorker(page);
    const scriptURL = await page.evaluate(
      async () => (await navigator.serviceWorker.ready).active?.scriptURL,
    );
    expect(scriptURL).toMatch(/\/sw\.js$/);

    // What DevTools' Application > Manifest panel reports, and Chrome's install criteria.
    if (browserName === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      const { errors } = await cdp.send("Page.getAppManifest");
      expect(errors, "manifest errors and warnings").toEqual([]);
      const { installabilityErrors } = await cdp.send(
        "Page.getInstallabilityErrors",
      );
      expect(installabilityErrors, "installability errors").toEqual([]);
    }
  });

  test("reopens a visited Guide and the Guide Index offline, but not an unvisited Guide", async ({
    page,
    context,
  }) => {
    // Online: the Guide Index, then one Guide, as a diner would.
    await page.goto("/");
    await expect(
      page.getByTestId("guide-index/guide-card").first(),
    ).toBeVisible();
    await waitForServiceWorker(page);
    // The first card's photo loaded before the worker existed; the page hands it over.
    const cardPhoto = page
      .locator('[data-testid="guide-index/guide-card"] img')
      .first();
    await expect
      .poll(() =>
        imagesLoaded(page, '[data-testid="guide-index/guide-card"] img'),
      )
      .toBe(true);
    const cardPhotoSrc = await cardPhoto.evaluate(
      (image) => (image as HTMLImageElement).currentSrc,
    );
    await expect
      .poll(() => cachedUrls(page))
      .toEqual(expect.arrayContaining([`${GATEWAY}/guides`, cardPhotoSrc]));
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toBeVisible();
    const guideTitle = await title.textContent();
    const cover = page.locator('[data-testid="guide/guide-header"] img');
    await expect
      .poll(() => imagesLoaded(page, '[data-testid="guide/guide-header"] img'))
      .toBe(true);
    const coverSrc = await cover
      .first()
      .evaluate((image) => (image as HTMLImageElement).currentSrc);
    await expect
      .poll(() => cachedUrls(page))
      .toEqual(
        expect.arrayContaining([
          `${GATEWAY}/guides`,
          `${GATEWAY}/guides/${CAFE_GUIDE_ID}`,
          coverSrc,
        ]),
      );

    // Airplane mode: the visited Guide reloads with its data and the photo already seen.
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: guideTitle ?? "" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("guide/restaurant-card").first(),
    ).toBeVisible();
    await expect
      .poll(() => imagesLoaded(page, '[data-testid="guide/guide-header"] img'))
      .toBe(true);
    await expectNoAxeViolations(page);

    // The Guide Index too, with the card photo seen on the first visit.
    await page.goto("/");
    await expect(
      page.getByTestId("guide-index/guide-card").first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[data-testid="guide-index/guide-card"] img')
          .first()
          .evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
      )
      .toBe(true);

    // A Guide never opened: the error panel says the diner is offline.
    await page.goto(`/guides/${OTHER_GUIDE_ID}`);
    const panel = page.getByTestId("guide/error-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(message("guide_errorPanel_title"));
    await expect(panel).toContainText(message("errorPanel_offlineBody"));
    await expectNoAxeViolations(page);

    // Back online, retry loads it.
    await context.setOffline(false);
    await panel.getByTestId("guide/error-panel/retry").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
