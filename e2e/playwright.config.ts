import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

// The PWA specs (#43) need a production build: the service worker is off in `pnpm dev`. Locally and
// in CI they run against `vite preview` (:4173) of a build pointed at a second gateway (:4300) that
// serves the photos itself, as the deployed gateway does, so photos are cacheable. Against a
// deployed site (PLAYWRIGHT_BASE_URL), they run there.
const PWA_PREVIEW_PORT = 4173;
const PWA_GATEWAY_PORT = 4300;
const pwaBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PWA_PREVIEW_PORT}`;
const pwaGatewayURL = `http://localhost:${PWA_GATEWAY_PORT}`;
const PWA_SPECS = /pwa\.spec\.ts/;

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
    {
      name: "chromium-desktop",
      testIgnore: PWA_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      testIgnore: PWA_SPECS,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "pwa-desktop",
      testMatch: PWA_SPECS,
      use: { ...devices["Desktop Chrome"], baseURL: pwaBaseURL },
    },
    {
      name: "pwa-mobile",
      testMatch: PWA_SPECS,
      use: { ...devices["Pixel 7"], baseURL: pwaBaseURL },
    },
  ],
  // The whole stack from the repo root: data server (:8888/:9999/:7777), gateway (:4000), web (:3000).
  // Reuses an already-running `pnpm dev` locally; CI always starts its own.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
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
        // The PWA specs' gateway: the same app on the Data Server `pnpm dev` started, with photo
        // URLs on its own /photos route and CORS for the preview's origin.
        {
          command: `uv run uvicorn app.main:app --port ${PWA_GATEWAY_PORT}`,
          cwd: "../api-gateway",
          url: `${pwaGatewayURL}/health`,
          reuseExistingServer: !isCI,
          timeout: 60_000,
          env: {
            PUBLIC_BASE_URL: pwaGatewayURL,
            CORS_ALLOWED_ORIGINS: JSON.stringify([
              `http://localhost:${PWA_PREVIEW_PORT}`,
            ]),
          },
          gracefulShutdown: { signal: "SIGINT", timeout: 10_000 },
        },
        // The PWA specs' production build, served as Firebase Hosting would (SPA fallback).
        {
          command: `pnpm build && pnpm exec vite preview --port ${PWA_PREVIEW_PORT} --strictPort`,
          cwd: "../web",
          url: pwaBaseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
          env: { VITE_API_BASE_URL: pwaGatewayURL },
          gracefulShutdown: { signal: "SIGINT", timeout: 10_000 },
        },
      ],
});
