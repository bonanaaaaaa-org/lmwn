import { expect, test } from "@playwright/test";

// The deployed Storybook (#35): every story renders, and loads nothing but the Storybook's own
// files. Stories use fixtures only, so a request to any other origin (the gateway, the Data
// Server, a CDN) or a failed request fails the story. Runs only when STORYBOOK_URL is set (the
// Deploy prod job, or locally against a served `storybook-static`), on the desktop project. The
// index is fetched once per worker when the file loads; smoke-test.sh has already checked it.
const storybookUrl = process.env.STORYBOOK_URL?.replace(/\/$/, "");

type IndexEntry = { id: string; title: string; name: string; type: string };

async function loadEntries(url: string): Promise<IndexEntry[]> {
  const response = await fetch(`${url}/index.json`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GET ${url}/index.json answered ${response.status}`);
  }
  const index = (await response.json()) as {
    entries: Record<string, IndexEntry>;
  };
  return Object.values(index.entries).filter(
    (entry) => entry.type === "story" || entry.type === "docs",
  );
}

// Every story, and every docs page (autodocs and MDX), from the deployed index.
const entries: IndexEntry[] = storybookUrl
  ? await loadEntries(storybookUrl)
  : [];

test.describe("Storybook", () => {
  test.skip(!storybookUrl, "STORYBOOK_URL is not set");
  test.skip(({ isMobile }) => isMobile, "runs once, on the desktop project");

  test("lists stories", () => {
    expect(
      entries.filter((entry) => entry.type === "story").length,
    ).toBeGreaterThan(0);
  });

  for (const story of entries) {
    test(`${story.title} / ${story.name} (${story.type}) renders without network errors`, async ({
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
        `${storybookUrl}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=${story.type}`,
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
