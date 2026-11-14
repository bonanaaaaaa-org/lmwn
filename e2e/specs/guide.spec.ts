import {
  type APIRequestContext,
  expect,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";

const GATEWAY = process.env.API_BASE_URL ?? "http://localhost:4000";

// Seeded Guides. The Guide Index list (GET /guides) isn't built yet, so these specs deep-link.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb"; // "10 คาเฟ่ลับ One Bangkok!", 10 short write-ups
const LONG_WRITE_UP_GUIDE_ID = "34c790dd-123b-499b-ba55-ea2f5befb452"; // 3 items, long write-ups
const UNKNOWN_GUIDE_ID = "00000000-0000-4000-8000-000000000000";

interface GatewayGuide {
  title: string;
  socialTitle: string;
  tags: string[];
  items: {
    description: string;
    photos: unknown[];
    restaurant: { name: string } | null;
  }[];
}

async function fetchGuide(
  request: APIRequestContext,
  guideId: string,
): Promise<GatewayGuide> {
  const response = await request.get(`${GATEWAY}/guides/${guideId}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as GatewayGuide;
}

/** Only the browser's call to the gateway, never the web app's own `/guides/:id` document. */
function gatewayGuideUrl(guideId: string): string {
  return `${GATEWAY}/guides/${guideId}`;
}

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: `../test-screenshots/guide/issue-10/${name}-${testInfo.project.name}.png`,
    fullPage: true,
  });
}

function isPhone(testInfo: TestInfo): boolean {
  return testInfo.project.name === "chromium-mobile";
}

const cards = (page: Page) => page.getByTestId("guide/restaurant-card");

test.describe("Guide - Default", () => {
  test("shows the header and the restaurant cards in the editor's order", async ({
    page,
    request,
  }, testInfo) => {
    const guide = await fetchGuide(request, CAFE_GUIDE_ID);

    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    const header = page.getByTestId("guide/guide-header");
    await expect(
      page.getByRole("heading", { level: 1, name: guide.title }),
    ).toBeVisible();
    await expect(page).toHaveTitle(guide.socialTitle);
    await expect(header.getByRole("time")).toHaveText("10 มี.ค. 2567");

    const cover = header.getByRole("img", { name: guide.title });
    await expect(cover).toHaveAttribute("fetchpriority", "high");
    await expect(cover).toHaveAttribute("loading", "eager");

    const tags = header.getByTestId("guide/guide-header/tag");
    await expect(tags).toHaveCount(guide.tags.length);
    for (const [index, tag] of guide.tags.entries()) {
      await expect(tags.nth(index)).toHaveAttribute(
        "href",
        `/?${new URLSearchParams({ tag }).toString()}`,
      );
    }

    await expect(cards(page)).toHaveCount(guide.items.length);
    for (const [index, item] of guide.items.entries()) {
      await expect(
        cards(page).nth(index).getByRole("heading", { level: 2 }),
      ).toContainText(item.restaurant?.name ?? "");
    }

    await screenshot(page, testInfo, "01-default");
  });

  test("each card has a call link, a Wongnai link and lazily loaded, named photos", async ({
    page,
    request,
  }) => {
    const guide = await fetchGuide(request, CAFE_GUIDE_ID);
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    const first = cards(page).first();
    const name = guide.items[0]?.restaurant?.name ?? "";
    // External links must leave the app untouched (not resolved as in-app paths).
    await expect(
      first.getByTestId("guide/restaurant-card/call"),
    ).toHaveAttribute("href", /^tel:\d+$/);
    await expect(
      first.getByTestId("guide/restaurant-card/wongnai"),
    ).toHaveAttribute("href", /^https:\/\/www\.wongnai\.com\/restaurants\//);
    await expect(
      first.getByTestId("guide/restaurant-card/map"),
    ).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );

    const photoCount = guide.items[0]?.photos.length ?? 0;
    const firstPhoto = first.getByRole("img", {
      name: `รูปที่ 1 จาก ${photoCount} ของ ${name}`,
    });
    await expect(firstPhoto).toHaveAttribute("srcset", /\d+w, .+\d+w/);

    // The last card is far below the fold on both layouts: its photos wait to be scrolled to.
    const lastPhotos = cards(page)
      .last()
      .getByTestId("guide/restaurant-card/photo-strip")
      .getByRole("img");
    await expect(lastPhotos.first()).toBeAttached();
    expect(
      await lastPhotos.evaluateAll((images) =>
        images.map((image) => image.getAttribute("loading")),
      ),
    ).toEqual(
      Array.from(
        { length: guide.items.at(-1)?.photos.length ?? 0 },
        () => "lazy",
      ),
    );
  });

  test("the photo strip snaps, showing ~3 photos on desktop and ~1 plus a peek on a phone", async ({
    page,
  }, testInfo) => {
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    // The first item (ONIBUS COFFEE) has 4 photos.
    const strip = cards(page)
      .first()
      .getByTestId("guide/restaurant-card/photo-strip")
      .getByRole("list");
    await expect(strip.getByRole("listitem")).toHaveCount(4);

    const metrics = await strip.evaluate((list) => {
      const item = list.querySelector("li");
      return {
        snapType: getComputedStyle(list).scrollSnapType,
        snapAlign: item ? getComputedStyle(item).scrollSnapAlign : "",
        itemsInView:
          list.clientWidth / (item?.getBoundingClientRect().width ?? 1),
        overflows: list.scrollWidth > list.clientWidth,
      };
    });

    expect(metrics.snapType).toBe("x mandatory");
    expect(metrics.snapAlign).toContain("start");
    expect(metrics.overflows).toBe(true);
    if (isPhone(testInfo)) {
      expect(metrics.itemsInView).toBeGreaterThan(1.1);
      expect(metrics.itemsInView).toBeLessThan(1.5);
    } else {
      expect(metrics.itemsInView).toBeGreaterThan(2.9);
      expect(metrics.itemsInView).toBeLessThan(3.3);
    }
  });

  test("the back link returns to the Guide Index", async ({
    page,
  }, testInfo) => {
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    const back = page.getByTestId("guide/back-link");
    await expect(back).toHaveCount(1);
    await expect(back).toHaveAccessibleName(
      isPhone(testInfo) ? "กลับไปไกด์ทั้งหมด" : /ไกด์ทั้งหมด/,
    );
    await back.click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(cards(page).first()).toBeVisible();

    await expectNoAxeViolations(page);
  });
});

test.describe("Guide - Read more", () => {
  test("a long write-up expands and collapses", async ({ page }, testInfo) => {
    await page.goto(`/guides/${LONG_WRITE_UP_GUIDE_ID}`);

    const readMore = cards(page)
      .first()
      .getByTestId("guide/restaurant-card/read-more");
    await expect(readMore).toHaveAttribute("aria-expanded", "false");
    await expect(readMore).toHaveText("อ่านเพิ่มเติม");

    await readMore.click();
    await expect(readMore).toHaveAttribute("aria-expanded", "true");
    await expect(readMore).toHaveText("แสดงน้อยลง");
    await screenshot(page, testInfo, "02-read-more-expanded");

    await readMore.click();
    await expect(readMore).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Guide - Not found", () => {
  test("an unknown Guide says so and links to the Guide Index, with no axe violations", async ({
    page,
  }, testInfo) => {
    await page.goto(`/guides/${UNKNOWN_GUIDE_ID}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "ไม่พบไกด์นี้" }),
    ).toBeVisible();
    await expect(page.getByTestId("guide/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
    await screenshot(page, testInfo, "03-not-found");

    await expectNoAxeViolations(page);
  });
});

test.describe("Guide - Error", () => {
  test("after automatic retries it offers to try again, and recovers", async ({
    page,
  }, testInfo) => {
    let calls = 0;
    await page.route(gatewayGuideUrl(CAFE_GUIDE_ID), (route) => {
      calls += 1;
      return route.fulfill({
        status: 503,
        json: { detail: "Service unavailable" },
      });
    });

    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    // 1 attempt + 2 retries with backoff (~1s, ~2s). In dev, React StrictMode may add a
    // duplicate first request, so count at least the 3 attempts.
    await expect(
      page.getByRole("heading", { level: 1, name: "โหลดไกด์ไม่สำเร็จ" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    expect(calls).toBeGreaterThanOrEqual(3);
    const retry = page.getByTestId("guide/error-panel/retry");
    await expect(retry).toHaveText("ลองใหม่");
    await screenshot(page, testInfo, "04-error");
    await expectNoAxeViolations(page);

    await page.unroute(gatewayGuideUrl(CAFE_GUIDE_ID));
    await retry.click();

    await expect(page.getByTestId("guide/error-panel")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 1, name: "10 คาเฟ่ลับ One Bangkok!" }),
    ).toBeVisible();
  });
});

test.describe("Guide - Unavailable Restaurant", () => {
  test("a Restaurant that failed to load keeps its write-up and photos", async ({
    page,
  }, testInfo) => {
    let unavailable: GatewayGuide["items"][number] | undefined;
    await page.route(gatewayGuideUrl(CAFE_GUIDE_ID), async (route) => {
      const response = await route.fetch();
      const guide = (await response.json()) as GatewayGuide;
      unavailable = guide.items[1];
      if (unavailable) unavailable.restaurant = null;
      await route.fulfill({ response, json: guide });
    });

    await page.goto(`/guides/${CAFE_GUIDE_ID}`);

    const card = cards(page).nth(1);
    await expect(card).toHaveAttribute("data-state", "unavailable");
    await expect(card.getByText("ไม่สามารถโหลดข้อมูลร้านได้")).toBeVisible();
    await expect(card.getByText(unavailable?.description ?? "")).toBeVisible();
    await expect(
      card.getByRole("img", { name: /^รูปที่ 1 จาก \d+$/ }),
    ).toBeVisible();
    await expect(card.getByTestId("guide/restaurant-card/call")).toHaveCount(0);
    // Its neighbours are unaffected.
    await expect(
      cards(page).nth(0).getByRole("heading", { level: 2 }),
    ).toBeVisible();
    await expect(
      cards(page).nth(2).getByRole("heading", { level: 2 }),
    ).toBeVisible();

    await card.scrollIntoViewIfNeeded();
    await screenshot(page, testInfo, "05-unavailable-restaurant");
    await expectNoAxeViolations(page);
  });
});
