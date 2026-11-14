import { expect, test } from "@playwright/test";

// The deployed Storybook (#35): every story renders, and loads nothing but the Storybook's own
// files. Stories use fixtures only, so a request to any other origin (the gateway, the Data
// Server, a CDN) or a failed request fails the story. Runs only when STORYBOOK_URL is set (the
// Deploy prod job, or locally against a served `storybook-static`), on the desktop project.
const storybookUrl = process.env.STORYBOOK_URL?.replace(/\/$/, "");

type IndexEntry = { id: string; title: string; name: string; type: string };

const stories: IndexEntry[] = storybookUrl
  ? Object.values(
      (
        (await (await fetch(`${storybookUrl}/index.json`)).json()) as {
          entries: Record<string, IndexEntry>;
        }
      ).entries,
    ).filter((entry) => entry.type === "story")
  : [];

test.describe("Storybook", () => {
  test.skip(!storybookUrl, "STORYBOOK_URL is not set");
  test.skip(({ isMobile }) => isMobile, "runs once, on the desktop project");

  test("lists stories", () => {
    expect(stories.length).toBeGreaterThan(0);
  });

  for (const story of stories) {
    test(`${story.title} / ${story.name} renders without network errors`, async ({
      page,
    }) => {
      const origin = new URL(storybookUrl!).origin;
      const problems: string[] = [];

      page.on("request", (request) => {
        const url = new URL(request.url());
        if (url.protocol.startsWith("http") && url.origin !== origin) {
          problems.push(`request to another origin: ${request.url()}`);
        }
      });
      page.on("requestfailed", (request) => {
        problems.push(
          `failed: ${request.url()} (${request.failure()?.errorText})`,
        );
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          problems.push(`${response.status()}: ${response.url()}`);
        }
      });
      page.on("pageerror", (error) =>
        problems.push(`page error: ${error.message}`),
      );

      await page.goto(
        `${storybookUrl}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
      );

      // Storybook marks <body> once the story has rendered, or failed to.
      const body = page.locator("body");
      await expect(body).toHaveClass(/sb-show-(main|errordisplay|nopreview)/);
      await expect(
        body,
        "the story renders without an error display",
      ).toHaveClass(/sb-show-main/);
      await page.waitForLoadState("networkidle");

      expect(problems).toEqual([]);
    });
  }
});
