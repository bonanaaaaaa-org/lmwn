import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Allure results for the combined report (root `pnpm allure`, CI). Listing reporters replaces
// Vitest's defaults, so they are listed again: GitHub annotations only in Actions.
const reporters = process.env.GITHUB_ACTIONS
  ? ["default", "github-actions"]
  : ["default"];

// Separate from vite.config.ts: the React Router plugin is for the dev server
// and build only — tests render components directly with plugin-react. Paraglide compiles the
// message catalog here too, so `pnpm test` works on a clean checkout.
export default defineConfig({
  plugins: [paraglideVitePlugin({ project: "./project.inlang" }), react()],
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    modules: {
      generateScopedName: "[local]",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    include: [
      "{app,src}/**/*.test.{ts,tsx}",
      "stylelint-plugins/**/*.test.mjs",
    ],
    reporters: [
      ...reporters,
      [
        "allure-vitest/reporter",
        {
          resultsDir: "allure-results/unit",
          globalLabels: { layer: "Web unit (Vitest)" },
        },
      ],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test-utils/**",
      ],
      // The same 90% floor as the gateway's pytest gate: `pnpm test` (and CI) fails below it.
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
