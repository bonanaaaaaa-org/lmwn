import {
  expect,
  type Locator,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { format, message } from "#support/messages";

/**
 * Dark mode, issue #47. The colour tokens are `light-dark()` pairs; `color-scheme` on <html>
 * follows the system unless a saved choice (localStorage `hidden-gems-theme`, applied by the
 * head script as `data-theme`) fixes it. The header's icon-only theme toggle offers system,
 * light and dark on every header layout.
 */

// The cafe Guide ("10 คาเฟ่ลับ One Bangkok!"), seeded with fixed data.
const CAFE_GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";
const GUIDE_PATH = `/guides/${CAFE_GUIDE_ID}`;
const CAFE = "คาเฟ่";

const STORAGE_KEY = "hidden-gems-theme";

type Theme = "light" | "dark";
type Choice = Theme | "system";

/** `--color-background` on <html> per theme (web/src/styles/globals.css). */
const BACKGROUND: Record<Theme, string> = {
  light: "rgb(245, 245, 244)",
  dark: "rgb(18, 18, 17)",
};
/** `--color-focus` per theme. */
const FOCUS: Record<Theme, string> = {
  light: "rgb(17, 17, 17)",
  dark: "rgb(242, 242, 239)",
};
/** `<meta name="theme-color">` per theme (THEME_COLORS in web/src/lib/theme.ts). */
const THEME_COLOR: Record<Theme, string> = {
  light: "#f2b705",
  dark: "#121211",
};

const LABEL: Record<Choice, string> = {
  system: message("themeToggle_option_systemLabel"),
  light: message("themeToggle_option_lightLabel"),
  dark: message("themeToggle_option_darkLabel"),
};

function isPhone(testInfo: TestInfo): boolean {
  return testInfo.project.name === "chromium-mobile";
}

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: `../test-screenshots/theme/issue-47/${name}-${testInfo.project.name}.png`,
  });
}

/** The header's theme toggle, named after the current choice. */
const themeToggle = (page: Page, current?: Choice) =>
  current
    ? page.getByRole("button", {
        name: format("themeToggle_trigger_ariaLabel", {
          theme: LABEL[current],
        }),
        exact: true,
      })
    : page.getByTestId("app/header/theme-toggle/trigger");
const themeMenu = (page: Page) =>
  page.getByTestId("app/header/theme-toggle/menu");
/** Every option, in order: system, light, dark. */
const themeOptions = (page: Page) =>
  page.getByTestId("app/header/theme-toggle/option");
const themeOption = (page: Page, choice: Choice) =>
  themeOptions(page).filter({ hasText: new RegExp(`^${LABEL[choice]}$`) });

const html = (page: Page) => page.locator("html");
const background = (page: Page) =>
  html(page).evaluate((root) => getComputedStyle(root).backgroundColor);

/** The page renders `theme`: <html>'s computed background. */
async function expectTheme(page: Page, theme: Theme): Promise<void> {
  // The resolved `light-dark()` value, so it reflects the used scheme whether `color-scheme` is
  // fixed by `data-theme` or is "light dark" following the system.
  await expect.poll(() => background(page)).toBe(BACKGROUND[theme]);
}

/**
 * The toolbar colour the browser uses for each OS scheme: the first `theme-color` meta, in
 * document order, with no `media` or a `media` matching that scheme (the HTML rule). Checked
 * for both schemes so a stale meta left behind for the other one shows up too.
 */
const effectiveThemeColors = (page: Page) =>
  page.evaluate(() => {
    const metas = [
      ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    ];
    const pick = (scheme: string) =>
      metas.find(
        (meta) =>
          !meta.media || meta.media.includes(`prefers-color-scheme: ${scheme}`),
      )?.content;
    return { light: pick("light"), dark: pick("dark") };
  });

/** A saved choice: the toolbar is that theme's colour whatever the OS scheme. */
async function expectThemeColor(page: Page, theme: Theme): Promise<void> {
  await expect
    .poll(() => effectiveThemeColors(page))
    .toEqual({ light: THEME_COLOR[theme], dark: THEME_COLOR[theme] });
}

/** No saved choice: the toolbar follows the OS scheme. */
async function expectSystemThemeColor(page: Page): Promise<void> {
  await expect.poll(() => effectiveThemeColors(page)).toEqual(THEME_COLOR);
}

const savedChoice = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

/** Saves a choice before any page script runs, as if picked on an earlier visit. */
async function saveChoice(page: Page, choice: Theme): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      // Only on the first document: a later reload must see what the app saved since.
      if (sessionStorage.getItem("e2e-theme-seeded")) return;
      sessionStorage.setItem("e2e-theme-seeded", "1");
      localStorage.setItem(key, value);
    },
    [STORAGE_KEY, choice] as const,
  );
}

interface Paint {
  at: string;
  background: string;
  scheme: string;
  theme: string | null;
}

/**
 * Samples <html>'s computed background and colour scheme in every animation frame from the
 * very first one (which runs before the first paint, once the head's render-blocking styles and
 * scripts are in) until a few frames after `load`, so a frame painted in the other theme, even
 * briefly before the app's JavaScript runs, shows up. Runs on every document, reloads included.
 */
async function recordPaints(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const paints: Paint[] = [];
    const store = window as unknown as {
      __themePaints: Paint[];
      __themePaintsDone: boolean;
    };
    store.__themePaints = paints;
    store.__themePaintsDone = false;
    const sample = (at: string) => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      paints.push({
        at,
        background: style.backgroundColor,
        scheme: style.colorScheme,
        theme: root.getAttribute("data-theme"),
      });
    };
    let frame = 0;
    let afterLoad = 0;
    const onFrame = () => {
      sample(`frame ${frame++}`);
      if (document.readyState === "complete") afterLoad++;
      if (afterLoad > 10) store.__themePaintsDone = true;
      else requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
  });
}

async function expectEveryPaint(page: Page, theme: Theme): Promise<void> {
  await page.waitForFunction(
    () =>
      (window as unknown as { __themePaintsDone: boolean }).__themePaintsDone,
  );
  const paints = await page.evaluate(
    () => (window as unknown as { __themePaints: Paint[] }).__themePaints,
  );
  expect(paints.length).toBeGreaterThan(10);
  expect(paints[0]?.at).toBe("frame 0");
  expect(
    paints.filter((paint) => paint.background !== BACKGROUND[theme]),
    `every frame from the first paint is ${theme}`,
  ).toEqual([]);
}

/** A tap on a phone (touch input), a click on desktop. */
async function press(target: Locator, testInfo: TestInfo): Promise<void> {
  if (isPhone(testInfo)) await target.tap();
  else await target.click();
}

async function chooseWithPointer(
  page: Page,
  testInfo: TestInfo,
  choice: Choice,
): Promise<void> {
  await press(themeToggle(page), testInfo);
  await expect(themeMenu(page)).toBeVisible();
  await press(themeOption(page, choice), testInfo);
  await expect(themeMenu(page)).toHaveCount(0);
}

/** Tabs from the top of the page until the theme toggle has keyboard focus. */
async function tabToThemeToggle(page: Page): Promise<void> {
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (await themeToggle(page).evaluate((el) => el === document.activeElement))
      return;
  }
  throw new Error("Tab never reached the theme toggle");
}

async function openIndex(page: Page): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: message("guideIndex_title") }),
  ).toBeVisible();
  await expect(page.getByTestId("guide-index/guide-card")).toHaveCount(2, {
    timeout: 15_000,
  });
}

async function openGuide(page: Page): Promise<void> {
  await page.goto(GUIDE_PATH);
  // The dev stack can be slow to serve the first load under many parallel workers.
  await expect(page.getByTestId("guide/filters")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("guide/restaurant-card").first()).toBeVisible();
}

test.describe("Theme - System default", () => {
  test.use({ colorScheme: "dark" });

  test("with the OS dark and no saved choice, the first paint is dark, on load and reload", async ({
    page,
  }) => {
    await recordPaints(page);

    await openIndex(page);
    await expectEveryPaint(page, "dark");
    await expectTheme(page, "dark");
    await expect(html(page)).not.toHaveAttribute("data-theme");
    await expect(themeToggle(page, "system")).toBeVisible();
    await expectSystemThemeColor(page);

    await page.reload();
    await expectEveryPaint(page, "dark");
    await expectTheme(page, "dark");
  });

  test("'system' follows the OS live, without a reload", async ({ page }) => {
    await openGuide(page);
    await expectTheme(page, "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expectTheme(page, "light");

    await page.emulateMedia({ colorScheme: "dark" });
    await expectTheme(page, "dark");
    await expect(html(page)).not.toHaveAttribute("data-theme");
  });
});

test.describe("Theme - Saved choice", () => {
  test("a saved light choice wins over a dark OS, from the first paint", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await saveChoice(page, "light");
    await recordPaints(page);

    await openGuide(page);

    await expectEveryPaint(page, "light");
    await expectTheme(page, "light");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(themeToggle(page, "light")).toBeVisible();
    await expectThemeColor(page, "light");
  });

  test("a saved dark choice wins over a light OS, from the first paint", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await saveChoice(page, "dark");
    await recordPaints(page);

    await openIndex(page);

    await expectEveryPaint(page, "dark");
    await expectTheme(page, "dark");
    await expect(themeToggle(page, "dark")).toBeVisible();
    await expectThemeColor(page, "dark");

    // A fixed choice ignores OS changes.
    await page.emulateMedia({ colorScheme: "light" });
    await expectTheme(page, "dark");
  });
});

test.describe("Theme - Toggle", () => {
  test.use({ colorScheme: "light" });

  test("the icon button sits in a wrapper, is at least 44×44 px with a visible focus ring from the keyboard", async ({
    page,
  }, testInfo) => {
    await openIndex(page);
    const button = themeToggle(page, "system");
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute(
      "data-testid",
      "app/header/theme-toggle/trigger",
    );
    await expect(
      page.getByTestId("app/header/theme-toggle").getByRole("button"),
    ).toHaveCount(1);
    // Icon only: the name comes from aria-label, the glyph is hidden.
    await expect(button).toHaveText("");
    await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");

    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await expectTheme(page, theme);
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      await tabToThemeToggle(page);

      await expect(button).toHaveAttribute("data-focus-visible", "true");
      await expect(button).toHaveCSS("outline-style", "solid");
      await expect(button).toHaveCSS("outline-color", FOCUS[theme]);
      // Drawn outside the button, so nothing inside it covers the ring.
      await expect(button).toHaveCSS("outline-offset", "2px");
      await expect(button).toHaveCSS("outline-width", "3px");
      await screenshot(page, testInfo, `01-focus-ring-${theme}`);
    }
  });

  test("choosing dark with the mouse or a tap applies at once and persists across reload", async ({
    page,
  }, testInfo) => {
    await openIndex(page);
    await expectTheme(page, "light");
    await expectSystemThemeColor(page);

    await press(themeToggle(page, "system"), testInfo);
    const menu = themeMenu(page);
    await expect(menu).toBeVisible();
    await expect(themeOptions(page)).toHaveText([
      LABEL.system,
      LABEL.light,
      LABEL.dark,
    ]);
    await expect(themeOption(page, "system")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await screenshot(page, testInfo, "02-menu-open");
    await press(themeOption(page, "dark"), testInfo);
    await expect(menu).toHaveCount(0);

    await expectTheme(page, "dark");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(themeToggle(page, "dark")).toBeVisible();
    await expectThemeColor(page, "dark");
    expect(await savedChoice(page)).toBe("dark");

    await recordPaints(page);
    await page.reload();
    await expectEveryPaint(page, "dark");
    await expectTheme(page, "dark");
    await expect(themeToggle(page, "dark")).toBeVisible();

    // Back to system: the saved entry goes and the OS (light) applies again.
    await chooseWithPointer(page, testInfo, "system");
    await expectTheme(page, "light");
    await expect(html(page)).not.toHaveAttribute("data-theme");
    await expectSystemThemeColor(page);
    expect(await savedChoice(page)).toBeNull();
  });

  test("works from the keyboard", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openIndex(page);
    await expectTheme(page, "dark");

    await tabToThemeToggle(page);
    await page.keyboard.press("Enter");
    await expect(themeMenu(page)).toBeVisible();
    const light = themeOption(page, "light");
    for (let i = 0; i < 4 && !(await isFocused(light)); i++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(light).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(themeMenu(page)).toHaveCount(0);
    await expectTheme(page, "light");
    await expectThemeColor(page, "light");
    expect(await savedChoice(page)).toBe("light");
    // Focus returns to the toggle, now named after the new choice.
    await expect(themeToggle(page, "light")).toBeFocused();
  });

  test("the Guide page's header has the toggle, and its choice carries to the Guide Index", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    await chooseWithPointer(page, testInfo, "dark");
    await expectTheme(page, "dark");

    await page.getByTestId("guide/back-link").click();
    await expect(page).toHaveURL(/\/$/);
    await expectTheme(page, "dark");
    await expect(themeToggle(page, "dark")).toBeVisible();
  });
});

const isFocused = (locator: Locator) =>
  locator.evaluate((el) => el === document.activeElement);

test.describe("Theme - Accessibility in dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("the Guide Index has no axe violations, also with the theme menu open", async ({
    page,
  }, testInfo) => {
    await openIndex(page);
    await expectTheme(page, "dark");
    await screenshot(page, testInfo, "03-index-dark");

    await expectNoAxeViolations(page);

    await themeToggle(page).click();
    await expect(themeMenu(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the Guide page has no axe violations by default", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    await expectTheme(page, "dark");
    await screenshot(page, testInfo, "04-guide-dark");

    await expectNoAxeViolations(page);
  });

  test("the Guide page has no axe violations filtered and sorted, and with the sort list open", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    await page
      .getByTestId("guide/filters/category")
      .filter({ hasText: new RegExp(`^${CAFE}$`) })
      .click();
    await page.getByTestId("guide/filters/delivery").click();
    await expect(page.getByTestId("guide/filters/delivery")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page
        .getByTestId("guide/filters")
        .getByText(format("guideFilters_count_body", { shown: 4, total: 10 }), {
          exact: true,
        }),
    ).toBeVisible();
    await expectTheme(page, "dark");
    await screenshot(page, testInfo, "05-guide-filtered-dark");

    await expectNoAxeViolations(page);

    await page.getByTestId("guide/filters/sort-select/trigger").click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the Guide page has no axe violations with the Lightbox open", async ({
    page,
  }, testInfo) => {
    await openGuide(page);
    const photo = page
      .getByTestId("guide/restaurant-card")
      .first()
      .getByTestId("guide/restaurant-card/photo-strip/photo")
      .nth(1);
    await press(photo, testInfo);
    const lightbox = page.getByTestId("guide/lightbox");
    await expect(lightbox.getByRole("img").first()).toBeVisible();
    // Let the entrance transition finish so colours are scanned at full opacity.
    await page.waitForFunction(
      () => !document.querySelector("[data-entering]"),
    );
    await screenshot(page, testInfo, "06-lightbox-dark");

    await expectNoAxeViolations(page);
  });
});

test.describe("Theme - Narrow phones", () => {
  // The toggle adds a 48px target to both phone headers; they must stay one 56px row with the
  // whole brand visible on the narrowest phones too.
  for (const width of [320, 360]) {
    test(`both phone headers stay one row at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.skip(!isPhone(testInfo), "Phone header layouts only");
      await page.setViewportSize({ width, height: 720 });
      for (const path of ["/", GUIDE_PATH]) {
        await page.goto(path);
        const header = page.getByTestId("app/header");
        const brand = page.getByTestId("app/header/logo");
        const trigger = page.getByTestId("app/header/theme-toggle/trigger");
        await expect(trigger).toBeVisible();
        await expect(brand).toBeVisible();
        const box = async (locator: Locator) => {
          const value = await locator.boundingBox();
          if (!value) throw new Error("no bounding box");
          return value;
        };
        const headerBox = await box(header);
        const brandBox = await box(brand);
        const triggerBox = await box(trigger);
        expect(headerBox.height).toBeLessThanOrEqual(57);
        expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(
          triggerBox.x + 0.5,
        );
        const truncated = await brand
          .locator("span")
          .evaluate((span) => span.scrollWidth > span.clientWidth);
        expect(truncated, `brand truncated on ${path}`).toBe(false);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    });
  }
});
