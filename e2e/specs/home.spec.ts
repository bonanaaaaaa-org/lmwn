import { expect, test } from "@playwright/test";

test.describe("Home - Shell", () => {
  test("renders the app heading without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /guide to hidden gems/i }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the API gateway the app talks to is healthy", async ({ request }) => {
    const gateway = process.env.API_BASE_URL ?? "http://localhost:4000";

    const response = await request.get(`${gateway}/health`);

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
