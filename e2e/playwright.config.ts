import { defineConfig, devices } from "@playwright/test";

import { DEVICE_TAGS } from "./support/devices";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [
    isCI ? ["github"] : ["list"],
    ["html", { open: "never" }],
    // Results for the combined Allure report (root `pnpm allure`, CI). It attaches what Playwright
    // keeps for a failed test below: its trace, screenshot and video.
    [
      "allure-playwright",
      {
        resultsDir: "allure-results",
        globalLabels: { layer: "E2E (Playwright)" },
      },
    ],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // A test tagged for one device only is never scheduled on the other project, so it
    // doesn't show up as skipped (Allure reports a runtime skip as an error message).
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: new RegExp(DEVICE_TAGS.phoneOnly),
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
      grepInvert: new RegExp(DEVICE_TAGS.desktopOnly),
    },
  ],
  // The whole stack from the repo root: data server (:8888/:9999/:7777), gateway (:4000), web (:3000).
  // Reuses an already-running `pnpm dev` locally; CI always starts its own.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        cwd: "..",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        stdout: "pipe",
        // Ctrl-C semantics: turbo forwards SIGINT to the data server, uvicorn and Vite, so
        // nothing is left listening after the run.
        gracefulShutdown: { signal: "SIGINT", timeout: 10_000 },
      },
});
