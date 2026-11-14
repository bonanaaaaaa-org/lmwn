import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Story tests: every story in .storybook/main.ts renders in headless Chromium, runs its
// play function, then an axe scan. `a11y.test: "error"` in .storybook/preview.ts makes any
// violation fail. Kept apart from vitest.config.ts so `pnpm test` stays fast jsdom unit tests.
// Builds on vite.config.ts (path alias, CSS Modules naming) like Storybook does; the script sets
// STORYBOOK=true so the React Router plugin is skipped there. viteFinal in main.ts is applied by
// the plugin.
export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [storybookTest({ configDir: ".storybook" })],
    test: {
      name: "storybook",
      // Allure results for the combined report; listing reporters replaces Vitest's defaults.
      reporters: [
        ...(process.env.GITHUB_ACTIONS
          ? ["default", "github-actions"]
          : ["default"]),
        [
          "allure-vitest/reporter",
          {
            resultsDir: "allure-results/storybook",
            globalLabels: { layer: "Storybook stories (Vitest)" },
          },
        ],
      ],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({}),
        instances: [{ browser: "chromium" }],
      },
    },
  }),
);
