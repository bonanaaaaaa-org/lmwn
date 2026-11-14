import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "#support/axe";
import { message } from "#support/messages";

test.describe("Home - Shell", () => {
  test("renders the app heading without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: message("guideIndex_title"),
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("has no axe violations (WCAG 2.2 A and AA)", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: message("guideIndex_title"),
      }),
    ).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test("the API gateway the app talks to is healthy", async ({ request }) => {
    const gateway = process.env.API_BASE_URL ?? "http://localhost:4000";

    const response = await request.get(`${gateway}/health`);

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
