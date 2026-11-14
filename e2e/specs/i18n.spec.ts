import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { message } from "#support/messages";

test.describe("Shell - Thai copy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("declares Thai and titles the document from the catalog", async ({
    page,
  }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page).toHaveTitle(message("app_title"));
  });

  test("renders the skip link, tagline and footer from the catalog", async ({
    page,
  }) => {
    await expect(
      page.getByRole("link", { name: message("app_skipLink_label") }),
    ).toHaveAttribute("href", "#main-content");
    await expect(page.getByRole("banner")).toContainText(
      message("header_tagline_body"),
    );
    await expect(page.getByRole("contentinfo")).toContainText(
      message("app_footer_body"),
    );
  });

  test("the skip link moves keyboard focus to the main content", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Skip links serve keyboard users; a touch phone has no Tab key to reach it",
    );
    const skipLink = page.getByRole("link", {
      name: message("app_skipLink_label"),
    });

    // Under load (dev server, parallel workers) a Tab sent before the app has hydrated is lost.
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("main")).toBeFocused();
    await expect(page).toHaveURL(/#main-content$/);
  });
});

test.describe("Not Found - Unknown route", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(
      page.getByRole("heading", { level: 1, name: message("notFound_title") }),
    ).toBeVisible();
  });

  test("explains the missing page and links back from the catalog", async ({
    page,
  }) => {
    await expect(page.getByText(message("notFound_body"))).toBeVisible();
    await expect(
      page.getByRole("link", { name: message("notFound_backLink_label") }),
    ).toBeVisible();
  });

  test("the back link returns to the Guide Index", async ({ page }) => {
    await page
      .getByRole("link", { name: message("notFound_backLink_label") })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: message("guideIndex_title"),
      }),
    ).toBeVisible();
  });

  test("has no axe violations (WCAG 2.2 A and AA)", async ({ page }) => {
    await expectNoAxeViolations(page);
  });
});
