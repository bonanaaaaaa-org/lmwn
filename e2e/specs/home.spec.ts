import { expect, test } from "@playwright/test";

// The page at `/` (heading, console errors, axe scans) is covered by guide-index.spec.ts.
test.describe("Stack", () => {
  test("the API gateway the app talks to is healthy", async ({ request }) => {
    const gateway = process.env.API_BASE_URL ?? "http://localhost:4000";

    const response = await request.get(`${gateway}/health`);

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
