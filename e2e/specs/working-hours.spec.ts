import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";

const GATEWAY = process.env.API_BASE_URL ?? "http://localhost:4000";

// "10 คาเฟ่ลับ One Bangkok!": the 4th item, LMWN Cafe, is closed Monday and Sunday, 09:00–17:00 otherwise.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";
const LMWN_CAFE_INDEX = 3;

// Instants as UTC; Bangkok is UTC+7 with no DST.
const THU_NOON_BANGKOK = new Date("2026-11-12T05:00:00Z"); // Wed 21:00 in Los Angeles
const TUE_0859_BANGKOK = new Date("2026-11-10T01:59:00Z");
const MON_NOON_BANGKOK = new Date("2026-11-09T05:00:00Z");

const DAY_NAMES = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

interface GatewayGuide {
  timeZone: string;
  items: {
    restaurant: {
      name: string;
      workingHours: {
        day: number;
        ranges: { opensAt: number; closesAt: number }[];
      }[];
    } | null;
  }[];
}

async function fetchGuide(request: APIRequestContext): Promise<GatewayGuide> {
  const response = await request.get(`${GATEWAY}/guides/${CAFE_GUIDE_ID}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as GatewayGuide;
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: `../test-screenshots/guide/issue-11/${name}-${testInfo.project.name}.png`,
    fullPage: true,
  });
}

const cards = (page: Page) => page.getByTestId("guide/restaurant-card");
const workingHours = (card: Locator) =>
  card.getByTestId("guide/restaurant-card/working-hours");
const toggleOf = (card: Locator) =>
  card.getByTestId("guide/restaurant-card/working-hours/toggle");

async function openGuideAt(page: Page, time: Date): Promise<Locator> {
  await page.clock.install({ time });
  await page.goto(`/guides/${CAFE_GUIDE_ID}`);
  const card = cards(page).nth(LMWN_CAFE_INDEX);
  // The dev stack can be slow to serve the first load under many parallel workers.
  await expect(card.getByRole("heading", { level: 2 })).toContainText(
    "LMWN Cafe",
    { timeout: 15_000 },
  );
  return card;
}

test.describe("Working Hours - Open Now in Thailand time", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("Thursday noon in Bangkok (Wednesday in LA) is open, with Thursday as today", async ({
    page,
    request,
  }, testInfo) => {
    // The seed matches what this spec assumes.
    const guide = await fetchGuide(request);
    expect(guide.timeZone).toBe("Asia/Bangkok");
    const cafe = guide.items[LMWN_CAFE_INDEX]?.restaurant;
    expect(cafe?.name).toBe("LMWN Cafe");
    const thursday = cafe?.workingHours.find((d) => d.day === 4);
    expect(thursday?.ranges).toEqual([{ opensAt: 540, closesAt: 1020 }]);

    const card = await openGuideAt(page, THU_NOON_BANGKOK);
    // Sanity: the browser itself really thinks it is Wednesday.
    expect(
      await page.evaluate(() => new Date().getDay()),
      "browser-local weekday",
    ).toBe(3);

    const hours = workingHours(card);
    await expect(hours.getByText("เวลาทำการ", { exact: true })).toBeVisible();
    await expect(hours).toContainText("เปิดอยู่");
    await expect(hours).not.toContainText("ปิดอยู่ · เปิด");
    await expect(hours).toContainText("วันนี้ 09:00–17:00");

    const toggle = toggleOf(card);
    await expect(toggle).toHaveText("ดูเวลาทั้งสัปดาห์ · ปิดวันจันทร์, อาทิตย์");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const today = hours.locator('tr[aria-current="date"]');
    await expect(today).toHaveCount(1);
    await expect(today.getByRole("rowheader")).toHaveText("พฤหัสบดี (วันนี้)");
    await expect(today.getByRole("cell")).toHaveText("09:00–17:00");

    await card.scrollIntoViewIfNeeded();
    await screenshot(page, testInfo, "01-week-expanded-thursday");
  });
});

test.describe("Working Hours - Live update", () => {
  test("closed at 08:59 switches to open after 09:00 without a reload", async ({
    page,
  }) => {
    const card = await openGuideAt(page, TUE_0859_BANGKOK);
    const hours = workingHours(card);
    await expect(hours).toContainText("ปิดอยู่ · เปิด 09:00");
    await expect(hours).toContainText("วันนี้ 09:00–17:00");

    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });

    await page.clock.runFor(90_000);

    await expect(hours).toContainText("เปิดอยู่");
    await expect(hours).not.toContainText("ปิดอยู่ · เปิด");
    expect(navigations, "no reload").toBe(0);
  });
});

test.describe("Working Hours - Closed day", () => {
  test("Monday in Bangkok reads closed today", async ({ page, request }) => {
    const guide = await fetchGuide(request);
    const monday = guide.items[LMWN_CAFE_INDEX]?.restaurant?.workingHours.find(
      (d) => d.day === 1,
    );
    expect(monday?.ranges).toEqual([]);

    const card = await openGuideAt(page, MON_NOON_BANGKOK);
    const hours = workingHours(card);
    await expect(hours).toContainText("ปิดวันนี้");
    await expect(hours).toContainText("วันนี้ ปิด");
    await expect(hours).not.toContainText("เปิดอยู่");

    // A neighbour open every day is unaffected (ONIBUS COFFEE, 08:00–17:00).
    const onibus = workingHours(cards(page).first());
    await expect(onibus).toContainText("เปิดอยู่");
    await expect(onibus).toContainText("วันนี้ 08:00–17:00");
  });
});

test.describe("Working Hours - Week toggle", () => {
  async function expectWeek(card: Locator, guide: GatewayGuide) {
    const rows = workingHours(card).getByRole("row");
    await expect(rows).toHaveCount(7);
    const week = guide.items[LMWN_CAFE_INDEX]?.restaurant?.workingHours ?? [];
    for (const [i, name] of DAY_NAMES.entries()) {
      const day = week.find((d) => d.day === i + 1);
      const expected =
        day && day.ranges.length > 0
          ? day.ranges
              .map((r) => `${hhmm(r.opensAt)}–${hhmm(r.closesAt)}`)
              .join(", ")
          : "ปิด";
      // Thursday is today with THU_NOON_BANGKOK.
      await expect(rows.nth(i).getByRole("rowheader")).toHaveText(
        i === 3 ? `${name} (วันนี้)` : name,
      );
      await expect(rows.nth(i).getByRole("cell")).toHaveText(expected);
    }
  }

  test("expands and collapses with click or tap", async ({ page, request }) => {
    const guide = await fetchGuide(request);
    const card = await openGuideAt(page, THU_NOON_BANGKOK);
    const toggle = toggleOf(card);

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(workingHours(card).getByRole("row")).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveText("ซ่อนเวลาทั้งสัปดาห์");
    await expectWeek(card, guide);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveText("ดูเวลาทั้งสัปดาห์ · ปิดวันจันทร์, อาทิตย์");
    await expect(workingHours(card).getByRole("row")).toHaveCount(0);
  });

  test("expands and collapses with the keyboard", async ({ page, request }) => {
    const guide = await fetchGuide(request);
    const card = await openGuideAt(page, THU_NOON_BANGKOK);
    const toggle = toggleOf(card);

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expectWeek(card, guide);

    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(workingHours(card).getByRole("row")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });
});

test.describe("Working Hours - Accessibility", () => {
  test("has no axe violations with the week expanded", async ({ page }) => {
    const card = await openGuideAt(page, THU_NOON_BANGKOK);
    // Expand LMWN Cafe (with closed days) and ONIBUS COFFEE (open every day).
    await toggleOf(card).click();
    await toggleOf(cards(page).first()).click();
    await expect(workingHours(card).getByRole("row")).toHaveCount(7);
    await expect(
      workingHours(cards(page).first()).getByRole("row"),
    ).toHaveCount(7);

    await expectNoAxeViolations(page);
  });
});
