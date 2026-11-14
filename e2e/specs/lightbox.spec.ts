import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { format } from "#support/messages";

const GATEWAY = process.env.API_BASE_URL ?? "http://localhost:4000";

// The seeded cafe Guide: its first Guide Item, ONIBUS COFFEE, has 4 photos.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";

interface GatewayPhoto {
  smallUrl: string;
  largeUrl: string;
}

async function firstItem(request: APIRequestContext) {
  const response = await request.get(`${GATEWAY}/guides/${CAFE_GUIDE_ID}`);
  expect(response.ok()).toBe(true);
  const guide = (await response.json()) as {
    items: { photos: GatewayPhoto[]; restaurant: { name: string } | null }[];
  };
  const item = guide.items[0];
  if (!item?.restaurant)
    throw new Error("the seeded first item has a Restaurant");
  return { name: item.restaurant.name, photos: item.photos };
}

/** The lightbox's accessible name: the Restaurant, then the photo counter. */
function title(name: string, position: number, total: number): string {
  return `${name} ${format("lightbox_counter_body", { position, total })}`;
}

/** The strip's (and the lightbox's) alt text for a photo. */
function alt(name: string, position: number, total: number): string {
  return format("restaurantCard_photoStrip_photo_alt", {
    position,
    total,
    restaurant: name,
  });
}

function isPhone(testInfo: TestInfo): boolean {
  return testInfo.project.name === "chromium-mobile";
}

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: `../test-screenshots/guide/issue-12/${name}-${testInfo.project.name}.png`,
  });
}

const stripPhotos = (page: Page) =>
  page
    .getByTestId("guide/restaurant-card")
    .first()
    .getByTestId("guide/restaurant-card/photo-strip/photo");

const lightbox = (page: Page) => page.getByTestId("guide/lightbox");

/** A tap on a phone (touch input), a click on desktop. */
async function press(target: Locator, testInfo: TestInfo): Promise<void> {
  if (isPhone(testInfo)) await target.tap();
  else await target.click();
}

/** A real one-finger swipe, through the browser's touch input. */
async function swipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const steps = 8;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

test.describe("Guide - Lightbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/guides/${CAFE_GUIDE_ID}`);
    // The first load in each worker can wait on Vite and the gateway's upstream fan-out.
    await expect(stripPhotos(page).first()).toBeVisible({ timeout: 15_000 });
  });

  test("opens on the photo pressed, with the large image and the strip's alt text", async ({
    page,
    request,
  }, testInfo) => {
    const { name, photos } = await firstItem(request);

    await press(stripPhotos(page).nth(1), testInfo);

    const dialog = page.getByRole("dialog", {
      name: title(name, 2, photos.length),
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-testid", "guide/lightbox");
    const photo = dialog.getByRole("img", {
      name: alt(name, 2, photos.length),
    });
    await expect(photo).toHaveAttribute("src", photos[1]?.largeUrl ?? "");
    await expect(
      stripPhotos(page).nth(1).getByRole("img", { includeHidden: true }),
    ).toHaveAttribute("alt", alt(name, 2, photos.length));

    await page.waitForFunction(
      () => !document.querySelector("[data-entering]"),
    );
    await screenshot(page, testInfo, "01-open");
  });

  test("moves with the arrow keys and buttons, closes with Esc, and returns focus to the photo", async ({
    page,
    request,
  }, testInfo) => {
    const { name, photos } = await firstItem(request);
    const total = photos.length;

    await press(stripPhotos(page).nth(1), testInfo);
    await expect(lightbox(page)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(lightbox(page)).toHaveAccessibleName(title(name, 3, total));
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(lightbox(page)).toHaveAccessibleName(title(name, 1, total));
    // Wraps from the first photo to the last.
    await press(page.getByTestId("guide/lightbox/prev"), testInfo);
    await expect(lightbox(page)).toHaveAccessibleName(
      title(name, total, total),
    );

    await page.keyboard.press("Escape");
    await expect(lightbox(page)).toHaveCount(0);
    await expect(stripPhotos(page).nth(1)).toBeFocused();
  });

  test.describe("keyboard", () => {
    test.skip(
      ({ isMobile }) => isMobile,
      "the keyboard-only path is a desktop journey",
    );

    test("keeps keyboard focus inside while open; the close button dismisses it", async ({
      page,
    }) => {
      await stripPhotos(page).first().focus();
      await page.keyboard.press("Enter");
      await expect(lightbox(page)).toBeVisible();

      const visited: (string | null)[] = [];
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press("Tab");
        visited.push(
          await page.evaluate(
            () => document.activeElement?.getAttribute("data-testid") ?? null,
          ),
        );
      }
      expect(visited).toEqual([
        "guide/lightbox/close",
        "guide/lightbox/prev",
        "guide/lightbox/next",
        "guide/lightbox/close",
      ]);

      await page.keyboard.press("Enter"); // on close
      await expect(lightbox(page)).toHaveCount(0);
      await expect(stripPhotos(page).first()).toBeFocused();
    });
  });

  test.describe("touch", () => {
    test.skip(
      ({ isMobile }) => !isMobile,
      "touch swipe needs the phone project",
    );

    test("swipes between photos on a touch screen", async ({
      page,
      request,
    }, testInfo) => {
      const { name, photos } = await firstItem(request);
      const total = photos.length;

      await stripPhotos(page).first().tap();
      const photo = lightbox(page).getByRole("img").first();
      await expect(photo).toBeVisible();
      const box = await photo.boundingBox();
      if (!box) throw new Error("the photo has a box");
      const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      // Right to left: the next photo.
      await swipe(
        page,
        { x: middle.x + 100, y: middle.y },
        { x: middle.x - 100, y: middle.y + 10 },
      );
      await expect(lightbox(page)).toHaveAccessibleName(title(name, 2, total));

      // Left to right: back again, then past the first photo to the last.
      await swipe(
        page,
        { x: middle.x - 100, y: middle.y },
        { x: middle.x + 100, y: middle.y },
      );
      await swipe(
        page,
        { x: middle.x - 100, y: middle.y },
        { x: middle.x + 100, y: middle.y },
      );
      await expect(lightbox(page)).toHaveAccessibleName(
        title(name, total, total),
      );

      // A mostly vertical drag is not a swipe.
      await swipe(
        page,
        { x: middle.x, y: middle.y - 120 },
        { x: middle.x + 60, y: middle.y + 120 },
      );
      await expect(lightbox(page)).toHaveAccessibleName(
        title(name, total, total),
      );
      await screenshot(page, testInfo, "02-swiped");

      await page.getByTestId("guide/lightbox/close").tap();
      await expect(lightbox(page)).toHaveCount(0);
      await expect(stripPhotos(page).first()).toBeFocused();
    });
  });

  test("animates opening and photo changes, unless the diner prefers reduced motion", async ({
    page,
  }, testInfo) => {
    // Record every CSS animation that starts inside the lightbox (backdrop included), so a
    // 200ms fade can't finish before the test looks. Page animations (skeletons) don't count.
    await page.evaluate(() => {
      const started: string[] = [];
      Object.assign(window, { lightboxAnimations: started });
      document.addEventListener(
        "animationstart",
        (event) => {
          const target = event.target as Element;
          if (
            target.closest('[role="dialog"], [data-entering], [data-exiting]')
          ) {
            started.push(event.animationName.replace(/__.*$/, ""));
          }
        },
        true,
      );
    });
    const started = () =>
      page.evaluate(
        () =>
          (window as unknown as { lightboxAnimations: string[] })
            .lightboxAnimations,
      );
    const clearStarted = () =>
      page.evaluate(() => {
        (
          window as unknown as { lightboxAnimations: string[] }
        ).lightboxAnimations.length = 0;
      });
    const openAndMove = async () => {
      await press(stripPhotos(page).first(), testInfo);
      await expect(lightbox(page)).toBeVisible();
      await press(page.getByTestId("guide/lightbox/next"), testInfo);
      // ONIBUS COFFEE has 4 photos: after one move, the counter reads photo 2 of 4.
      await expect(lightbox(page)).toHaveAccessibleName(
        new RegExp(
          `${format("lightbox_counter_body", { position: 2, total: 4 })}$`,
        ),
      );
    };
    const close = async () => {
      await page.keyboard.press("Escape");
      await expect(lightbox(page)).toHaveCount(0);
    };

    await openAndMove();
    await expect
      .poll(started)
      .toEqual(expect.arrayContaining(["fade-in", "slide-from-end"]));
    await close();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await clearStarted();
    await openAndMove();
    await close();
    expect(await started()).toEqual([]);
  });

  test("has no axe violations while open", async ({ page }, testInfo) => {
    await press(stripPhotos(page).nth(1), testInfo);
    await expect(lightbox(page).getByRole("img").first()).toBeVisible();
    // Let the entrance transition finish so colours are scanned at full opacity.
    await page.waitForFunction(
      () => !document.querySelector("[data-entering]"),
    );

    await expectNoAxeViolations(page);
  });
});
