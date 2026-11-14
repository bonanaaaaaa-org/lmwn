import { expect, type Page, type Request, test } from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";

/**
 * Guide Index (`/`), issue #15. Runs against the real Data Server sample data:
 * - "10 คาเฟ่ลับ One Bangkok!" (10 ร้าน), Tags กาแฟ คาเฟ่ กรุงเทพ One Bangkok
 * - "พาส่องพิกัดร้านดัง One Bangkok ทั้งคาเฟ่&ร้านอาหาร" (3 ร้าน), Tags กาแฟ คาเฟ่ ร้านอาหาร กรุงเทพ One Bangkok
 */
const CAFE_GUIDE = {
  title: "10 คาเฟ่ลับ One Bangkok!",
  description: "รวมคาเฟ่เด็ดที่ One Bangkok",
  count: "10 ร้าน",
  tags: ["กาแฟ", "คาเฟ่", "กรุงเทพ"],
};
const FOOD_GUIDE_TITLE = "พาส่องพิกัดร้านดัง One Bangkok ทั้งคาเฟ่&ร้านอาหาร";

const HEADING = "หาร้านที่ใช่ จากไกด์ที่คัดมาแล้ว";
const TOO_LONG = "คำค้นหายาวเกิน 100 ตัวอักษร";

// The app retries a failed query twice with backoff (~1 s + 2 s) before showing an error.
const AFTER_RETRIES = { timeout: 10_000 };

const cards = (page: Page) => page.getByTestId("guide-index/guide-card");
const searchbox = (page: Page) =>
  page.getByRole("searchbox", { name: "ค้นหาไกด์" });
const resultCount = (page: Page, n: number) =>
  page.getByText(`พบ ${n} ไกด์`, { exact: true });
const cardWithTitle = (page: Page, title: string) =>
  cards(page).filter({
    has: page.getByRole("heading", { level: 3, name: title }),
  });
/** A Tag in the "กรองตามแท็ก" filter (a React Aria TagGroup row, text "#<tag>"). */
const filterTag = (page: Page, tag: string) =>
  page
    .getByTestId("guide-index/tag-filter")
    .getByRole("row", { name: new RegExp(`^#?\\s*${tag}\\s*$`) });

const params = (page: Page) => new URL(page.url()).searchParams;
const historyLength = (page: Page) => page.evaluate(() => history.length);

/** A `GET /guides` request carrying a search text, for any gateway base URL. */
const isSearchRequest = (url: URL) =>
  url.pathname.endsWith("/guides") && url.searchParams.has("q");

async function openIndex(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { level: 1, name: HEADING }),
  ).toBeVisible();
}

async function openDefault(page: Page): Promise<void> {
  await openIndex(page);
  await expect(cards(page)).toHaveCount(2);
  await expect(resultCount(page, 2)).toBeVisible();
}

async function search(page: Page, text: string): Promise<void> {
  await searchbox(page).fill(text);
  await searchbox(page).press("Enter");
}

test.describe("Guide Index - default", () => {
  test("renders the heading without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await openDefault(page);

    expect(errors).toEqual([]);
  });

  test("shows a card per Guide with cover, title, description, Tags and restaurant count", async ({
    page,
  }) => {
    await openDefault(page);

    const card = cardWithTitle(page, CAFE_GUIDE.title);
    await expect(card).toBeVisible();
    // The cover's alt text is the Guide title.
    await expect(
      card.getByRole("img", { name: CAFE_GUIDE.title }),
    ).toBeVisible();
    await expect(card.getByText(CAFE_GUIDE.description)).toBeVisible();
    await expect(
      card.getByText(CAFE_GUIDE.count, { exact: true }),
    ).toBeVisible();
    for (const tag of CAFE_GUIDE.tags) {
      await expect(
        card.getByRole("link", { name: tag, exact: true }),
      ).toBeVisible();
    }

    const foodCard = cardWithTitle(page, FOOD_GUIDE_TITLE);
    await expect(foodCard.getByText("3 ร้าน", { exact: true })).toBeVisible();
    await expect(
      foodCard.getByRole("link", { name: "ร้านอาหาร", exact: true }),
    ).toBeVisible();
  });

  test("clicking a card outside its Tags opens the Guide", async ({ page }) => {
    await openDefault(page);
    const card = cardWithTitle(page, CAFE_GUIDE.title);
    const titleLink = card.getByTestId("guide-index/guide-card/link");
    await expect(titleLink).toHaveAccessibleName(CAFE_GUIDE.title);
    const href = await titleLink.getAttribute("href");
    expect(href).toMatch(/^\/guides\/[0-9a-f-]{36}$/);

    // The top-left corner is the cover: the stretched title link must cover it.
    await card.click({ position: { x: 16, y: 16 } });

    await expect(page).toHaveURL((url) => url.pathname === href);
  });

  test("shows a skeleton while the first load is in flight", async ({
    page,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(
      (url) => url.pathname.endsWith("/guides"),
      async (route) => {
        await gate;
        await route.continue();
      },
    );

    await openIndex(page);
    await expect(
      page.getByRole("status").filter({ hasText: "กำลังโหลดไกด์…" }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(0);

    release();
    await expect(cards(page)).toHaveCount(2);
    await expect(
      page.getByRole("status").filter({ hasText: "กำลังโหลดไกด์…" }),
    ).toHaveCount(0);
  });

  test("has no axe violations (WCAG 2.2 A and AA)", async ({ page }) => {
    await openDefault(page);

    await expectNoAxeViolations(page);
  });
});

test.describe("Guide Index - layout", () => {
  for (const { width, columns } of [
    { width: 375, columns: 1 },
    { width: 800, columns: 2 },
    { width: 1280, columns: 3 },
  ]) {
    test(`the grid has ${columns} column(s) at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await openDefault(page);

      const tracks = await page
        .getByRole("list")
        .filter({ has: cards(page).first() })
        .evaluate((list) => getComputedStyle(list).gridTemplateColumns);
      expect(tracks.split(" ")).toHaveLength(columns);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        "no horizontal scrolling",
      ).toBe(true);
    });
  }
});

test.describe("Guide Index - search", () => {
  test("typing commits q to the URL after the debounce and updates the count", async ({
    page,
  }) => {
    await openDefault(page);
    const lengthBefore = await historyLength(page);

    await searchbox(page).fill("ร้าน");
    // Not committed on the keystroke itself: the 300 ms debounce hasn't elapsed.
    expect(params(page).has("q")).toBe(false);
    await expect.poll(() => params(page).get("q")).toBe("ร้าน");

    await searchbox(page).fill("ร้านอาหาร");
    await expect.poll(() => params(page).get("q")).toBe("ร้านอาหาร");
    await expect(cards(page)).toHaveCount(1);
    await expect(resultCount(page, 1)).toBeVisible();
    await expect(cardWithTitle(page, FOOD_GUIDE_TITLE)).toBeVisible();
    // Starting the search pushes one entry; refining it replaces, not one per pause.
    expect(await historyLength(page)).toBe(lengthBefore + 1);

    await page.goBack();
    await expect.poll(() => params(page).has("q")).toBe(false);
    await expect(searchbox(page)).toHaveValue("");
  });

  test("Thai text matches inside words: คาเฟ่ finds both Guides", async ({
    page,
  }) => {
    await openDefault(page);

    await searchbox(page).fill("คาเฟ่");

    await expect.poll(() => params(page).get("q")).toBe("คาเฟ่");
    await expect(cards(page)).toHaveCount(2);
    await expect(resultCount(page, 2)).toBeVisible();
  });

  test("Enter commits immediately and pushes a history entry", async ({
    page,
  }) => {
    await page.clock.install();
    await openDefault(page);
    // Freeze the page's timers: the 300 ms debounce can't fire, so only Enter can commit.
    await page.clock.pauseAt(Date.now() + 5_000);
    const lengthBefore = await historyLength(page);

    await search(page, "ร้านอาหาร");

    await expect.poll(() => params(page).get("q")).toBe("ร้านอาหาร");
    expect(await historyLength(page)).toBe(lengthBefore + 1);
    // TanStack Query batches its UI updates on timers, so let them run for the results.
    await page.clock.resume();
    await expect(cards(page)).toHaveCount(1);
  });

  test("reload keeps the search text and results", async ({ page }) => {
    await openDefault(page);
    await search(page, "ร้านอาหาร");
    await expect(cards(page)).toHaveCount(1);

    await page.reload();

    await expect(searchbox(page)).toHaveValue("ร้านอาหาร");
    await expect(cards(page)).toHaveCount(1);
    await expect(resultCount(page, 1)).toBeVisible();
    expect(params(page).get("q")).toBe("ร้านอาหาร");
  });

  test("Back restores the previous view", async ({ page }) => {
    await openDefault(page);
    await search(page, "คาเฟ่");
    await expect.poll(() => params(page).get("q")).toBe("คาเฟ่");
    await filterTag(page, "ร้านอาหาร").click();
    await expect(cards(page)).toHaveCount(1);

    await page.goBack();
    await expect.poll(() => params(page).getAll("tag")).toEqual([]);
    expect(params(page).get("q")).toBe("คาเฟ่");
    await expect(searchbox(page)).toHaveValue("คาเฟ่");
    await expect(cards(page)).toHaveCount(2);
    await expect(filterTag(page, "ร้านอาหาร")).not.toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.goBack();
    await expect.poll(() => params(page).has("q")).toBe(false);
    await expect(searchbox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(2);
  });

  test("has no axe violations in the searched state", async ({ page }) => {
    await openDefault(page);
    await search(page, "ร้านอาหาร");
    await expect(cards(page)).toHaveCount(1);
    await expect(resultCount(page, 1)).toBeVisible();

    await expectNoAxeViolations(page);
  });
});

test.describe("Guide Index - Tag filter", () => {
  test("selecting a Tag filters the Guides and adds it to the URL", async ({
    page,
  }) => {
    await openDefault(page);

    await filterTag(page, "ร้านอาหาร").click();

    await expect(filterTag(page, "ร้านอาหาร")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect.poll(() => params(page).getAll("tag")).toEqual(["ร้านอาหาร"]);
    await expect(cards(page)).toHaveCount(1);
    await expect(cardWithTitle(page, FOOD_GUIDE_TITLE)).toBeVisible();
    await expect(resultCount(page, 1)).toBeVisible();
  });

  test("several Tags must all match", async ({ page }) => {
    await openDefault(page);

    // กาแฟ alone matches both Guides; with ร้านอาหาร only one has both.
    await filterTag(page, "กาแฟ").click();
    await expect.poll(() => params(page).getAll("tag")).toEqual(["กาแฟ"]);
    await expect(cards(page)).toHaveCount(2);

    await filterTag(page, "ร้านอาหาร").click();
    await expect
      .poll(() => params(page).getAll("tag").sort())
      .toEqual(["กาแฟ", "ร้านอาหาร"].sort());
    await expect(cards(page)).toHaveCount(1);
    await expect(cardWithTitle(page, FOOD_GUIDE_TITLE)).toBeVisible();
  });

  test("a Tag combines with the search text", async ({ page }) => {
    await openIndex(page, `/?${new URLSearchParams({ q: "ลับ" })}`);
    await expect(cards(page)).toHaveCount(1);
    await expect(cardWithTitle(page, CAFE_GUIDE.title)).toBeVisible();

    // "ลับ" only matches the café Guide, which doesn't have ร้านอาหาร.
    await filterTag(page, "ร้านอาหาร").click();

    await expect.poll(() => params(page).getAll("tag")).toEqual(["ร้านอาหาร"]);
    expect(params(page).get("q")).toBe("ลับ");
    await expect(searchbox(page)).toHaveValue("ลับ");
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByTestId("guide-index/empty-state")).toBeVisible();
  });

  test("clicking a Tag on a card applies it, keeping the search text", async ({
    page,
  }) => {
    await openIndex(page, `/?${new URLSearchParams({ q: "คาเฟ่" })}`);
    await expect(cards(page)).toHaveCount(2);

    await cardWithTitle(page, FOOD_GUIDE_TITLE)
      .getByRole("link", { name: "ร้านอาหาร", exact: true })
      .click();

    await expect.poll(() => params(page).getAll("tag")).toEqual(["ร้านอาหาร"]);
    expect(params(page).get("q")).toBe("คาเฟ่");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(cards(page)).toHaveCount(1);
    await expect(filterTag(page, "ร้านอาหาร")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("a shared /?tag= URL opens filtered", async ({ page }) => {
    await openIndex(page, `/?${new URLSearchParams({ tag: "ร้านอาหาร" })}`);

    await expect(cards(page)).toHaveCount(1);
    await expect(cardWithTitle(page, FOOD_GUIDE_TITLE)).toBeVisible();
    await expect(resultCount(page, 1)).toBeVisible();
    await expect(filterTag(page, "ร้านอาหาร")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("Guide Index - empty results", () => {
  test("no matches shows an empty state whose action clears the search", async ({
    page,
  }) => {
    await openDefault(page);
    await search(page, "ราเมน");

    const empty = page.getByTestId("guide-index/empty-state");
    await expect(empty).toBeVisible();
    await expect(
      empty.getByRole("heading", { name: "ไม่พบไกด์ที่ตรงกับ “ราเมน”" }),
    ).toBeVisible();
    await expect(
      empty.getByText("ลองใช้คำที่สั้นลง หรือเอาแท็กออกเพื่อดูไกด์ทั้งหมด"),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(0);

    const action = page.getByTestId("guide-index/empty-state/action");
    await expect(action).toHaveText("ล้างการค้นหา");
    await action.click();

    await expect(cards(page)).toHaveCount(2);
    await expect(resultCount(page, 2)).toBeVisible();
    await expect(searchbox(page)).toHaveValue("");
    await expect.poll(() => new URL(page.url()).search).toBe("");
    await expect(empty).toHaveCount(0);
  });

  test("has no axe violations in the empty state", async ({ page }) => {
    await openDefault(page);
    await search(page, "ราเมน");
    await expect(page.getByTestId("guide-index/empty-state")).toBeVisible();

    await expectNoAxeViolations(page);
  });
});

test.describe("Guide Index - loading and failure", () => {
  test("a failed search keeps the results and offers an inline retry", async ({
    page,
  }) => {
    await openDefault(page);
    const failed: Request[] = [];
    await page.route(isSearchRequest, async (route) => {
      failed.push(route.request());
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      });
    });

    await search(page, "ร้านอาหาร");

    const panel = page.getByTestId("guide-index/error-panel");
    await expect(panel).toBeVisible(AFTER_RETRIES);
    await expect(panel).toContainText(
      "ค้นหา “ร้านอาหาร” ไม่สำเร็จ ผลที่แสดงอยู่เป็นผลก่อนหน้า",
    );
    // The first try plus 2 automatic retries.
    expect(failed).toHaveLength(3);
    await expect(cards(page)).toHaveCount(2);
    await expectNoAxeViolations(page);

    await page.unroute(isSearchRequest);
    const retry = page.getByTestId("guide-index/error-panel/retry");
    await expect(retry).toHaveAccessibleName("ลองใหม่");
    await retry.click();

    await expect(panel).toHaveCount(0);
    await expect(cards(page)).toHaveCount(1);
    await expect(cardWithTitle(page, FOOD_GUIDE_TITLE)).toBeVisible();
    await expect(resultCount(page, 1)).toBeVisible();
  });

  test("previous results stay visible while a slow search loads", async ({
    page,
  }) => {
    await openDefault(page);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(isSearchRequest, async (route) => {
      await gate;
      await route.continue();
    });

    const requested = page.waitForRequest((request) =>
      isSearchRequest(new URL(request.url())),
    );
    await search(page, "ร้านอาหาร");
    await requested;

    // The search is in flight: the old cards stay, the list is marked busy, no skeleton.
    await expect(cards(page)).toHaveCount(2);
    await expect(cardWithTitle(page, CAFE_GUIDE.title)).toBeVisible();
    await expect(
      page.getByRole("list").filter({ has: cards(page) }),
    ).toHaveAttribute("aria-busy", "true");
    await expect(
      page.getByRole("status").filter({ hasText: "กำลังโหลดไกด์…" }),
    ).toHaveCount(0);

    release();
    await expect(cards(page)).toHaveCount(1);
    await expect(resultCount(page, 1)).toBeVisible();
    await expect(
      page.getByRole("list").filter({ has: cards(page) }),
    ).not.toHaveAttribute("aria-busy", "true");
  });
});

test.describe("Guide Index - search text length", () => {
  test("101 characters is rejected without sending a request", async ({
    page,
  }) => {
    await openDefault(page);
    const searches: string[] = [];
    page.on("request", (request) => {
      if (isSearchRequest(new URL(request.url()))) searches.push(request.url());
    });

    await search(page, "a".repeat(101));

    await expect(page.getByText(TOO_LONG)).toBeVisible();
    await expect(searchbox(page)).toHaveAttribute("aria-invalid", "true");
    // Give the debounce (300 ms) ample time to fire if it were going to.
    await page.waitForTimeout(800);
    expect(searches).toEqual([]);
    expect(params(page).has("q")).toBe(false);
    await expect(cards(page)).toHaveCount(2);
  });

  test("100 characters is allowed", async ({ page }) => {
    await openDefault(page);

    await search(page, "a".repeat(100));

    await expect.poll(() => params(page).get("q")).toBe("a".repeat(100));
    await expect(page.getByTestId("guide-index/empty-state")).toBeVisible();
    await expect(page.getByText(TOO_LONG)).toHaveCount(0);
    await expect(searchbox(page)).not.toHaveAttribute("aria-invalid", "true");
  });
});
