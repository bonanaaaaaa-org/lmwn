import {
  type APIRequestContext,
  expect,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";

const GATEWAY = process.env.API_BASE_URL ?? "http://localhost:4000";

// "10 คาเฟ่ลับ One Bangkok!": 10 Guide Items, enough that a late card starts off screen.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";
const LATE_CARD = 7;

interface GatewayGuide {
  title: string;
  socialTitle: string;
  items: { id: string; restaurant: { name: string } | null }[];
}

async function fetchGuide(request: APIRequestContext): Promise<GatewayGuide> {
  const response = await request.get(`${GATEWAY}/guides/${CAFE_GUIDE_ID}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as GatewayGuide;
}

function lateItem(guide: GatewayGuide) {
  const item = guide.items[LATE_CARD];
  if (!item?.restaurant)
    throw new Error("seed data: expected an available item");
  return { id: item.id, name: item.restaurant.name };
}

const cards = (page: Page) => page.getByTestId("guide/restaurant-card");

/** Opens a Guide and waits for its cards: a cold dev server can take a while to serve the first page. */
async function openGuide(page: Page, hash = "") {
  await page.goto(`/guides/${CAFE_GUIDE_ID}${hash}`);
  await expect(cards(page).first()).toBeVisible({ timeout: 15_000 });
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: `../test-screenshots/guide/issue-14/${name}-${testInfo.project.name}.png`,
  });
}

/** A browser without the Web Share API, as on most desktops: sharing copies the link. */
async function withoutWebShare(page: Page) {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, "share");
    Reflect.deleteProperty(Navigator.prototype, "canShare");
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
}

test.describe("Share - shared #item- link", () => {
  test("scrolls to the card once the Guide renders and highlights it briefly", async ({
    page,
    request,
  }, testInfo) => {
    const item = lateItem(await fetchGuide(request));

    await openGuide(page, `#item-${item.id}`);

    const card = page.locator(`#item-${item.id}`);
    await expect(card).toHaveAttribute("data-highlighted", "");
    await expect(card).toBeInViewport();
    await expect(card.getByRole("heading", { level: 2 })).toContainText(
      item.name,
    );
    await expect(
      cards(page).and(page.locator("[data-highlighted]")),
    ).toHaveCount(1);
    await screenshot(page, testInfo, "highlighted");
    await expectNoAxeViolations(page);

    // Brief: the highlight goes; the page stays where it is.
    await expect(card).not.toHaveAttribute("data-highlighted", {
      timeout: 5_000,
    });
    await expect(card).toBeInViewport();
  });

  test("with reduced motion, jumps to the card and the highlight doesn't animate", async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const item = lateItem(await fetchGuide(request));

    await openGuide(page, `#item-${item.id}`);

    const card = page.locator(`#item-${item.id}`);
    await expect(card).toHaveAttribute("data-highlighted", "");
    // No smooth scroll to wait for: the card is already in view.
    expect(
      await card.evaluate((element) => {
        const { top } = element.getBoundingClientRect();
        return top >= 0 && top < window.innerHeight;
      }),
    ).toBe(true);
    expect(
      await card.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ).toMatch(/^0s(, 0s)*$/);
  });

  test("coming Back to the Guide keeps the diner's place instead of jumping to the card again", async ({
    page,
    request,
  }) => {
    const item = lateItem(await fetchGuide(request));
    await openGuide(page, `#item-${item.id}`);
    const card = page.locator(`#item-${item.id}`);
    await expect(card).toBeInViewport();
    await expect(card).not.toHaveAttribute("data-highlighted", {
      timeout: 5_000,
    });

    // Scroll back to the top and leave through a Tag on the Guide header.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByTestId("guide/guide-header/tag").first().click();
    await expect(page).toHaveURL(/\/\?tag=/);
    await page.goBack();

    await expect(cards(page).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    await expect(card).not.toBeInViewport();
    await expect(page.locator("[data-highlighted]")).toHaveCount(0);
  });

  test("an unknown #item- opens the Guide normally, at the top", async ({
    page,
  }) => {
    await openGuide(page, "#item-00000000-0000-0000-0000-000000000000");

    await expect(cards(page)).toHaveCount(10);
    await expect(page.locator("[data-highlighted]")).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expectNoAxeViolations(page);
  });
});

test.describe("Share - copy-link fallback", () => {
  test("sharing a card copies a link that opens the Guide at that card", async ({
    page,
    request,
  }, testInfo) => {
    await withoutWebShare(page);
    const item = lateItem(await fetchGuide(request));
    await openGuide(page);

    const card = page.locator(`#item-${item.id}`);
    const share = card.getByTestId("guide/restaurant-card/share");
    await expect(share).toHaveAccessibleName(`แชร์ร้าน ${item.name}`);
    // Pressing repeatedly is safe: one toast, never a stack.
    await share.click();
    await share.click();
    await share.click();

    const toast = page.getByTestId("app/toast");
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText(`คัดลอกลิงก์ร้าน ${item.name} แล้ว`);
    // Focus pauses the toast's 4 s timer (as hovering does), so the checks below can't race it.
    await toast.focus();
    await screenshot(page, testInfo, "toast");
    await expectNoAxeViolations(page);

    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).pathname + new URL(link).hash).toBe(
      `/guides/${CAFE_GUIDE_ID}#item-${item.id}`,
    );

    await page.getByTestId("app/toast/close").click();
    await expect(toast).toHaveCount(0);

    // The diner who receives the link lands on that card.
    const received = await page.context().newPage();
    await received.goto(link);
    await expect(cards(received).first()).toBeVisible({ timeout: 15_000 });
    const receivedCard = received.locator(`#item-${item.id}`);
    await expect(receivedCard).toHaveAttribute("data-highlighted", "");
    await expect(receivedCard).toBeInViewport();
  });

  test("sharing the Guide copies its link and confirms with a toast", async ({
    page,
  }, testInfo) => {
    await withoutWebShare(page);
    await openGuide(page);

    // Beside the title on desktop; in the app header on a phone. Same test ID.
    const share = page.getByTestId("guide/guide-header/share");
    const inAppHeader = page
      .getByTestId("app/header")
      .getByTestId("guide/guide-header/share");
    if (testInfo.project.name === "chromium-mobile") {
      await expect(inAppHeader).toHaveAccessibleName("แชร์ไกด์");
    } else {
      await expect(inAppHeader).toHaveCount(0);
      await expect(share).toHaveText("แชร์ไกด์");
    }
    await share.click();

    await expect(page.getByTestId("app/toast")).toContainText("คัดลอกลิงก์แล้ว");
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(new RegExp(`/guides/${CAFE_GUIDE_ID}$`));
  });
});

test.describe("Share - Web Share API", () => {
  test("opens the share sheet with the Guide's socialTitle, and with the Restaurant and Guide for a card", async ({
    page,
    request,
  }) => {
    const guide = await fetchGuide(request);
    const item = lateItem(guide);
    await page.addInitScript(() => {
      const calls: ShareData[] = [];
      Object.assign(window, { shareCalls: calls });
      Navigator.prototype.share = (data?: ShareData) => {
        calls.push(data ?? {});
        return Promise.resolve();
      };
      Navigator.prototype.canShare = () => true;
    });
    await openGuide(page);

    await page.getByTestId("guide/guide-header/share").click();
    await page
      .locator(`#item-${item.id}`)
      .getByTestId("guide/restaurant-card/share")
      .click();

    const calls = await page.evaluate(
      () => (window as unknown as { shareCalls: ShareData[] }).shareCalls,
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]?.text).toBe(guide.socialTitle);
    expect(calls[0]?.url).toMatch(new RegExp(`/guides/${CAFE_GUIDE_ID}$`));
    expect(calls[1]?.text).toContain(item.name);
    expect(calls[1]?.text).toContain(guide.title);
    expect(calls[1]?.url).toMatch(new RegExp(`#item-${item.id}$`));
    await expect(page.getByTestId("app/toast")).toHaveCount(0);
  });
});
