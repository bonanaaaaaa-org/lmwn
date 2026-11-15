import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { format, message } from "#support/messages";

const GATEWAY = process.env.API_BASE_URL ?? "http://localhost:4000";

// The cafe Guide ("10 คาเฟ่ลับ One Bangkok!"), seeded with fixed data.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";
const GUIDE_PATH = `/guides/${CAFE_GUIDE_ID}`;
const TOTAL = 10;

// Its Restaurants in guide order (index → name), and the facts these specs rely on. All are
// Official except F.I.X COFFEE and Starbucks.
const R = {
  onibus: "ONIBUS COFFEE", // ร้านกาแฟ/ชา, 4.29 (6), delivery + pickup, daily 08:00–17:00
  kfc: "KFC", // ฟาสต์ฟู้ด/จานด่วน, 4.0 (2), delivery, daily 10:00–22:00
  blue: "BLUE COFFEE - URBAN COLLECTIONS", // คาเฟ่, 4.0 (1), delivery, daily 10:30–20:00
  lmwn: "LMWN Cafe", // คาเฟ่, Unrated, delivery + pickup, closed Mon/Sun, 09:00–17:00
  arabica: "% Arabica", // ร้านกาแฟ/ชา, Unrated, delivery, daily 07:00–21:00
  fix: "F.I.X COFFEE", // คาเฟ่, 4.0 (1), neither, weekdays from 07:00
  keen: "A KEEN HOUSE", // คาเฟ่, 4.0 (1), delivery + pickup, daily 10:00–20:00
  rise: "RISE COFFEE", // คาเฟ่, 4.42 (6), delivery + pickup, daily 08:00–21:00
  starbucks: "Starbucks", // ร้านกาแฟ/ชา, 4.42 (6), neither, daily 07:00–21:30
  riseBkk: "rise.bkk", // ร้านกาแฟ/ชา, 3.93 (16), delivery + pickup, daily 08:30–20:00
} as const;
const GUIDE_ORDER = [
  R.onibus,
  R.kfc,
  R.blue,
  R.lmwn,
  R.arabica,
  R.fix,
  R.keen,
  R.rise,
  R.starbucks,
  R.riseBkk,
];
// Best first; ties (4.42, 4.0) keep guide order; Unrated last.
const RATING_ORDER = [
  R.rise,
  R.starbucks,
  R.onibus,
  R.kfc,
  R.blue,
  R.fix,
  R.keen,
  R.riseBkk,
  R.lmwn,
  R.arabica,
];

const COFFEE_TEA = "ร้านกาแฟ/ชา";
const FAST_FOOD = "ฟาสต์ฟู้ด/จานด่วน";
const CAFE = "คาเฟ่";
const CATEGORIES = [COFFEE_TEA, FAST_FOOD, CAFE]; // first-seen order

const LMWN_INDEX = 3;

// Instants as UTC; Bangkok is UTC+7 with no DST.
const TUE_0815_BANGKOK = Temporal.Instant.from("2026-11-10T01:15:00Z");
const MON_NOON_BANGKOK = Temporal.Instant.from("2026-11-09T05:00:00Z");

interface GatewayGuide {
  items: {
    restaurant: {
      name: string;
      categories: string[];
      rating: number;
      numberOfReviews: number;
      delivery: boolean;
      pickup: boolean;
      official: boolean;
    } | null;
  }[];
}

async function fetchGuide(request: APIRequestContext): Promise<GatewayGuide> {
  const response = await request.get(`${GATEWAY}/guides/${CAFE_GUIDE_ID}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as GatewayGuide;
}

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  issue = 13,
): Promise<void> {
  await page.screenshot({
    path: `../test-screenshots/guide/issue-${issue}/${name}-${testInfo.project.name}.png`,
    fullPage: true,
  });
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cards = (page: Page) => page.getByTestId("guide/restaurant-card");
const toolbar = (page: Page) => page.getByTestId("guide/filters");
const categoryChip = (page: Page, name: string) =>
  page
    .getByTestId("guide/filters/category")
    .filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) });
const openNowChip = (page: Page) => page.getByTestId("guide/filters/open-now");
const deliveryChip = (page: Page) => page.getByTestId("guide/filters/delivery");
const pickupChip = (page: Page) => page.getByTestId("guide/filters/pickup");
const officialChip = (page: Page) => page.getByTestId("guide/filters/official");
const sortTrigger = (page: Page) =>
  page.getByTestId("guide/filters/sort-select/trigger");
const emptyState = (page: Page) => page.getByTestId("guide/empty-state");

/** The cards shown are exactly these Restaurants, in this order. */
async function expectRestaurants(page: Page, names: readonly string[]) {
  await expect(cards(page).getByRole("heading", { level: 2 })).toHaveText(
    names.map((name) => new RegExp(escapeRegExp(name))),
  );
}

async function expectCount(page: Page, shown: number) {
  await expect(
    toolbar(page).getByText(
      format("guideFilters_count_body", { shown, total: TOTAL }),
      { exact: true },
    ),
  ).toBeVisible();
}

async function expectPressed(chip: Locator, pressed: boolean) {
  await expect(chip).toHaveAttribute("aria-pressed", String(pressed));
}

async function chooseSort(page: Page, label: string) {
  await sortTrigger(page).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(sortTrigger(page)).toContainText(label);
}

/** The query string, normalised by URLSearchParams so it compares with `params()`. */
const query = (page: Page) => new URL(page.url()).searchParams.toString();
const params = (init: string[][]) => new URLSearchParams(init).toString();

async function openGuide(page: Page, search = ""): Promise<void> {
  await page.goto(`${GUIDE_PATH}${search}`);
  // The dev stack can be slow to serve the first load under many parallel workers.
  await expect(toolbar(page)).toBeVisible({ timeout: 15_000 });
}

test.describe("Filters - Seed", () => {
  test("the cafe Guide's Restaurants are what these specs assume", async ({
    request,
  }) => {
    const guide = await fetchGuide(request);
    const restaurants = guide.items.map((item) => item.restaurant);
    expect(restaurants.map((r) => r?.name)).toEqual(GUIDE_ORDER);
    expect(restaurants.map((r) => r?.categories)).toEqual([
      [COFFEE_TEA],
      [FAST_FOOD],
      [CAFE],
      [CAFE],
      [COFFEE_TEA],
      [CAFE],
      [CAFE],
      [CAFE],
      [COFFEE_TEA],
      [COFFEE_TEA],
    ]);
    expect(restaurants.map((r) => r?.delivery)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
    ]);
    expect(restaurants.map((r) => r?.pickup)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
    ]);
    expect(restaurants.map((r) => r?.official)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      true,
    ]);
    expect(restaurants.map((r) => r?.numberOfReviews === 0)).toEqual([
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

test.describe("Filters - Categories", () => {
  test("chips come from the Guide's Restaurants, several at once, each narrowing the list", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    await expect(toolbar(page)).toHaveAccessibleName(
      message("guideFilters_ariaLabel"),
    );
    await expect(page.getByTestId("guide/filters/category")).toHaveText(
      CATEGORIES,
    );
    await expectRestaurants(page, GUIDE_ORDER);
    await expectCount(page, TOTAL);

    await categoryChip(page, CAFE).click();
    await expectPressed(categoryChip(page, CAFE), true);
    await expectRestaurants(page, [R.blue, R.lmwn, R.fix, R.keen, R.rise]);
    await expectCount(page, 5);
    expect(query(page)).toBe(params([["category", CAFE]]));

    // Categories match any one: adding a second widens the list, in guide order.
    await categoryChip(page, COFFEE_TEA).click();
    await expectPressed(categoryChip(page, COFFEE_TEA), true);
    await expectRestaurants(
      page,
      GUIDE_ORDER.filter((name) => name !== R.kfc),
    );
    await expectCount(page, 9);
    expect(query(page)).toBe(
      params([
        ["category", CAFE],
        ["category", COFFEE_TEA],
      ]),
    );
    await screenshot(page, testInfo, "01-two-categories");

    await categoryChip(page, CAFE).click();
    await expectPressed(categoryChip(page, CAFE), false);
    await expectRestaurants(page, [
      R.onibus,
      R.arabica,
      R.starbucks,
      R.riseBkk,
    ]);
    await expectCount(page, 4);
    expect(query(page)).toBe(params([["category", COFFEE_TEA]]));
  });
});

test.describe("Filters - Toggles", () => {
  test("delivery, pickup and a Category must all hold", async ({ page }) => {
    await openGuide(page);
    await expect(deliveryChip(page)).toHaveText(
      message("guideFilters_delivery_label"),
    );
    await expect(pickupChip(page)).toHaveText(
      message("guideFilters_pickup_label"),
    );
    await expect(openNowChip(page)).toContainText(
      message("guideFilters_openNow_label"),
    );

    await deliveryChip(page).click();
    await expectPressed(deliveryChip(page), true);
    await expectRestaurants(
      page,
      GUIDE_ORDER.filter((name) => name !== R.fix && name !== R.starbucks),
    );
    await expectCount(page, 8);

    await pickupChip(page).click();
    await expectPressed(pickupChip(page), true);
    await expectRestaurants(page, [
      R.onibus,
      R.lmwn,
      R.keen,
      R.rise,
      R.riseBkk,
    ]);
    await expectCount(page, 5);

    await categoryChip(page, COFFEE_TEA).click();
    await expectRestaurants(page, [R.onibus, R.riseBkk]);
    await expectCount(page, 2);
    expect(query(page)).toBe(
      params([
        ["category", COFFEE_TEA],
        ["delivery", "1"],
        ["pickup", "1"],
      ]),
    );
  });
});

test.describe("Filters - Official", () => {
  const OFFICIAL = GUIDE_ORDER.filter(
    (name) => name !== R.fix && name !== R.starbucks,
  );

  test("shows only Official Restaurants, kept through a reload and Back", async ({
    page,
  }) => {
    await openGuide(page);
    await expect(officialChip(page)).toHaveText(
      message("guideFilters_official_label"),
    );
    // Worded like the card badge.
    await expect(officialChip(page)).toHaveText(
      message("restaurantCard_badges_official_label"),
    );
    await expectPressed(officialChip(page), false);

    await officialChip(page).click();
    await expectPressed(officialChip(page), true);
    await expectRestaurants(page, OFFICIAL);
    await expectCount(page, OFFICIAL.length);
    expect(query(page)).toBe(params([["official", "1"]]));

    await page.reload();
    await expect(toolbar(page)).toBeVisible({ timeout: 15_000 });
    await expectPressed(officialChip(page), true);
    await expectRestaurants(page, OFFICIAL);
    await expectCount(page, OFFICIAL.length);

    // AND with the other filters.
    await categoryChip(page, COFFEE_TEA).click();
    await expectRestaurants(page, [R.onibus, R.arabica, R.riseBkk]);
    await expectCount(page, 3);
    expect(query(page)).toBe(
      params([
        ["category", COFFEE_TEA],
        ["official", "1"],
      ]),
    );

    await page.goBack();
    await expectPressed(categoryChip(page, COFFEE_TEA), false);
    await expectPressed(officialChip(page), true);
    await expectRestaurants(page, OFFICIAL);
    expect(query(page)).toBe(params([["official", "1"]]));

    await page.goBack();
    await expectPressed(officialChip(page), false);
    await expectRestaurants(page, GUIDE_ORDER);
    await expectCount(page, TOTAL);
    expect(query(page)).toBe("");
  });

  test("with nothing matching, clearing the filters turns it off; axe stays clean", async ({
    page,
  }, testInfo) => {
    await openGuide(page, `?${params([["official", "1"]])}`);
    await expectPressed(officialChip(page), true);
    await screenshot(page, testInfo, "01-official-on", 64);
    await expectNoAxeViolations(page);

    // KFC is Official but has no pickup.
    await categoryChip(page, FAST_FOOD).click();
    await expectRestaurants(page, [R.kfc]);
    await pickupChip(page).click();
    await expect(emptyState(page)).toBeVisible();
    await expectCount(page, 0);
    await expectNoAxeViolations(page);

    await page.getByTestId("guide/empty-state/action").click();

    await expect(emptyState(page)).toHaveCount(0);
    await expectPressed(officialChip(page), false);
    await expectRestaurants(page, GUIDE_ORDER);
    await expectCount(page, TOTAL);
    expect(query(page)).toBe("");
  });
});

test.describe("Filters - Sort", () => {
  test("by Rating puts the best first and Unrated last, also within a filter", async ({
    page,
  }) => {
    await openGuide(page);
    await expect(sortTrigger(page)).toContainText(
      message("sortSelect_guideOrder_label"),
    );

    await sortTrigger(page).click();
    await expect(page.getByRole("option")).toHaveText([
      message("sortSelect_guideOrder_label"),
      message("sortSelect_rating_label"),
    ]);
    await page
      .getByRole("option", {
        name: message("sortSelect_rating_label"),
        exact: true,
      })
      .click();
    await expect(sortTrigger(page)).toContainText(
      message("sortSelect_rating_label"),
    );
    await expectRestaurants(page, RATING_ORDER);
    await expectCount(page, TOTAL);
    expect(query(page)).toBe(params([["sort", "rating"]]));

    await categoryChip(page, CAFE).click();
    await expectRestaurants(page, [R.rise, R.blue, R.fix, R.keen, R.lmwn]);
    expect(query(page)).toBe(
      params([
        ["category", CAFE],
        ["sort", "rating"],
      ]),
    );

    // Back to guide order: the default is left out of the URL.
    await chooseSort(page, message("sortSelect_guideOrder_label"));
    await expectRestaurants(page, [R.blue, R.lmwn, R.fix, R.keen, R.rise]);
    expect(query(page)).toBe(params([["category", CAFE]]));
  });

  test("works from the keyboard", async ({ page }) => {
    await openGuide(page);

    await categoryChip(page, CAFE).focus();
    await page.keyboard.press("Space");
    await expectPressed(categoryChip(page, CAFE), true);
    await expectCount(page, 5);

    await sortTrigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(sortTrigger(page)).toContainText(
      message("sortSelect_rating_label"),
    );
    await expectRestaurants(page, [R.rise, R.blue, R.fix, R.keen, R.lmwn]);
  });
});

test.describe("Filters - URL state", () => {
  test("a link restores the filters and sort, and so does a reload", async ({
    page,
  }) => {
    const search = `?${params([
      ["category", CAFE],
      ["delivery", "1"],
      ["sort", "rating"],
    ])}`;
    await openGuide(page, search);

    const expected = [R.rise, R.blue, R.keen, R.lmwn];
    const expectRestored = async () => {
      await expectPressed(categoryChip(page, CAFE), true);
      await expectPressed(categoryChip(page, COFFEE_TEA), false);
      await expectPressed(deliveryChip(page), true);
      await expectPressed(pickupChip(page), false);
      await expect(sortTrigger(page)).toContainText(
        message("sortSelect_rating_label"),
      );
      await expectRestaurants(page, expected);
      await expectCount(page, expected.length);
    };
    await expectRestored();

    await page.reload();
    await expect(toolbar(page)).toBeVisible({ timeout: 15_000 });
    await expectRestored();
  });

  test("Back and Forward step through filter changes", async ({ page }) => {
    await openGuide(page);

    await categoryChip(page, CAFE).click();
    await expectCount(page, 5);
    await deliveryChip(page).click();
    await expectCount(page, 4);
    await chooseSort(page, message("sortSelect_rating_label"));
    await expectRestaurants(page, [R.rise, R.blue, R.keen, R.lmwn]);

    await page.goBack();
    await expect(sortTrigger(page)).toContainText(
      message("sortSelect_guideOrder_label"),
    );
    await expectRestaurants(page, [R.blue, R.lmwn, R.keen, R.rise]);
    expect(query(page)).toBe(
      params([
        ["category", CAFE],
        ["delivery", "1"],
      ]),
    );

    await page.goBack();
    await expectPressed(deliveryChip(page), false);
    await expectPressed(categoryChip(page, CAFE), true);
    await expectCount(page, 5);
    expect(query(page)).toBe(params([["category", CAFE]]));

    await page.goBack();
    await expectPressed(categoryChip(page, CAFE), false);
    await expectRestaurants(page, GUIDE_ORDER);
    await expectCount(page, TOTAL);
    expect(new URL(page.url()).pathname).toBe(GUIDE_PATH);
    expect(query(page)).toBe("");

    await page.goForward();
    await expectPressed(categoryChip(page, CAFE), true);
    await expectCount(page, 5);
  });

  test("a Category the Guide doesn't have is ignored", async ({ page }) => {
    await openGuide(page, `?${params([["category", "ไม่มีหมวดนี้"]])}`);

    await expectRestaurants(page, GUIDE_ORDER);
    await expectCount(page, TOTAL);
    await expect(emptyState(page)).toHaveCount(0);
  });
});

test.describe("Filters - Empty state", () => {
  test("no matches offers to clear the filters, which keeps the sort", async ({
    page,
  }, testInfo) => {
    await openGuide(page, `?${params([["sort", "rating"]])}`);

    await categoryChip(page, FAST_FOOD).click();
    await expectRestaurants(page, [R.kfc]);
    await pickupChip(page).click();

    await expect(emptyState(page)).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await expect(
      emptyState(page).getByText(message("guide_emptyState_filteredTitle")),
    ).toBeVisible();
    await expect(
      emptyState(page).getByText(
        format("guideFilters_count_body", { shown: 0, total: TOTAL }),
      ),
    ).toBeVisible();
    await expectCount(page, 0);
    const action = page.getByTestId("guide/empty-state/action");
    await expect(action).toHaveText(
      message("guide_emptyState_action_clearFiltersLabel"),
    );
    await screenshot(page, testInfo, "02-empty-state");
    await expectNoAxeViolations(page);

    await action.click();

    await expect(emptyState(page)).toHaveCount(0);
    await expectRestaurants(page, RATING_ORDER);
    await expectCount(page, TOTAL);
    await expectPressed(categoryChip(page, FAST_FOOD), false);
    await expectPressed(pickupChip(page), false);
    await expect(sortTrigger(page)).toContainText(
      message("sortSelect_rating_label"),
    );
    expect(query(page)).toBe(params([["sort", "rating"]]));
  });
});

test.describe("Filters - Unavailable Restaurant", () => {
  test("is hidden only while a Restaurant-based filter is on", async ({
    page,
  }) => {
    // No seeded Guide has an Unavailable Restaurant: make LMWN Cafe's lookup fail.
    await page.route(`${GATEWAY}/guides/${CAFE_GUIDE_ID}`, async (route) => {
      const response = await route.fetch();
      const guide = (await response.json()) as GatewayGuide;
      const item = guide.items[LMWN_INDEX];
      if (item) item.restaurant = null;
      await route.fulfill({ response, json: guide });
    });
    await openGuide(page);

    const unavailable = cards(page).and(
      page.locator('[data-state="unavailable"]'),
    );
    await expect(cards(page)).toHaveCount(TOTAL);
    await expect(cards(page).nth(LMWN_INDEX)).toHaveAttribute(
      "data-state",
      "unavailable",
    );
    await expectCount(page, TOTAL);

    // Sorting is not a filter: it stays, after the Unrated.
    await chooseSort(page, message("sortSelect_rating_label"));
    await expect(cards(page)).toHaveCount(TOTAL);
    await expect(cards(page).last()).toHaveAttribute(
      "data-state",
      "unavailable",
    );
    await expect(cards(page).nth(TOTAL - 2)).toContainText(R.arabica);

    // Delivery: LMWN Cafe would match, but its Restaurant is unknown.
    await deliveryChip(page).click();
    await expect(unavailable).toHaveCount(0);
    await expect(cards(page)).toHaveCount(7);
    await expectCount(page, 7);

    await deliveryChip(page).click();
    await expect(unavailable).toHaveCount(1);
    await expect(cards(page)).toHaveCount(TOTAL);

    // Official: LMWN Cafe would match too.
    await officialChip(page).click();
    await expect(unavailable).toHaveCount(0);
    await expect(cards(page)).toHaveCount(7);
    await expectCount(page, 7);

    await officialChip(page).click();
    await expect(unavailable).toHaveCount(1);

    await categoryChip(page, CAFE).click();
    await expect(unavailable).toHaveCount(0);
    await expectRestaurants(page, [R.rise, R.blue, R.fix, R.keen]);
    await expectCount(page, 4);
  });
});

test.describe("Filters - Open Now", () => {
  // The viewer's clock is in another time zone: Open Now is judged in Thailand time.
  test.use({ timezoneId: "America/Los_Angeles" });

  test("Tuesday 08:15 in Bangkok shows only what is open then", async ({
    page,
  }) => {
    await page.clock.install({ time: TUE_0815_BANGKOK.epochMilliseconds });
    await openGuide(page);

    await openNowChip(page).click();
    await expectPressed(openNowChip(page), true);
    await expectRestaurants(page, [
      R.onibus,
      R.arabica,
      R.fix,
      R.rise,
      R.starbucks,
    ]);
    await expectCount(page, 5);
    expect(query(page)).toBe(params([["openNow", "1"]]));

    // AND with the other filters.
    await pickupChip(page).click();
    await expectRestaurants(page, [R.onibus, R.rise]);
  });

  test("Monday noon in Bangkok leaves out the Restaurant closed on Mondays", async ({
    page,
  }) => {
    await page.clock.install({ time: MON_NOON_BANGKOK.epochMilliseconds });
    await openGuide(page, `?${params([["openNow", "1"]])}`);

    await expectPressed(openNowChip(page), true);
    await expectRestaurants(
      page,
      GUIDE_ORDER.filter((name) => name !== R.lmwn),
    );
    await expectCount(page, 9);
  });
});

test.describe("Filters - Accessibility", () => {
  test("has no axe violations filtered and sorted, and with the sort list open", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    await categoryChip(page, CAFE).click();
    await deliveryChip(page).click();
    await chooseSort(page, message("sortSelect_rating_label"));
    await expectRestaurants(page, [R.rise, R.blue, R.keen, R.lmwn]);
    await screenshot(page, testInfo, "03-filtered-sorted");

    await expectNoAxeViolations(page);

    await sortTrigger(page).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.getByRole("option", {
        name: message("sortSelect_rating_label"),
        exact: true,
      }),
    ).toHaveAttribute("aria-selected", "true");
    await screenshot(page, testInfo, "04-sort-open");

    await expectNoAxeViolations(page);
  });
});
