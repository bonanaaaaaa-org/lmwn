import { defineConfig, devices } from "@playwright/test";

import { DEVICE_TAGS } from "./support/devices";

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
    // keeps below: a failed test's trace, screenshot and video, and a flaky test's trace.
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
    // Keep the trace of every failed attempt, and of a flaky test that passed on retry, for
    // replaying in Allure's trace viewer. Not every test: at ~5 MB each the report would be
    // too big to upload. The video and screenshot stay failure-only.
    trace: "retain-on-failure-and-retries",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // A test tagged for one device only is never scheduled on the other device's projects, so
    // it doesn't show up as skipped (Allure reports a runtime skip as an error message).
    // Against a deployed site the service worker would answer requests the specs mock with
    // page.route (Playwright can't route a worker's requests), so these projects block it.
    {
      name: "chromium-desktop",
      testIgnore: PWA_SPECS,
      grepInvert: new RegExp(DEVICE_TAGS.phoneOnly),
      use: { ...devices["Desktop Chrome"], serviceWorkers: "block" },
    },
    {
      name: "chromium-mobile",
      testIgnore: PWA_SPECS,
      grepInvert: new RegExp(DEVICE_TAGS.desktopOnly),
      use: { ...devices["Pixel 7"], serviceWorkers: "block" },
    },
    {
      name: "pwa-desktop",
      testMatch: PWA_SPECS,
      grepInvert: new RegExp(DEVICE_TAGS.phoneOnly),
      use: { ...devices["Desktop Chrome"], baseURL: pwaBaseURL },
    },
    {
      name: "pwa-mobile",
      testMatch: PWA_SPECS,
      grepInvert: new RegExp(DEVICE_TAGS.desktopOnly),
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
