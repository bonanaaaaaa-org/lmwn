import { defineConfig } from "allure";

// One combined Allure report from every suite's results: `pnpm allure` locally, and the
// `Allure report` job in CI, which uploads it to the shared report host (README, Test reports).
// Each suite writes into its own package; a missing directory (a suite that didn't run) is skipped.
export default defineConfig({
  name: "Guide to Hidden Gems",
  output: "./allure-report",
  resultsDir: [
    "./e2e/allure-results",
    "./web/allure-results/unit",
    "./web/allure-results/storybook",
    "./api-gateway/allure-results",
  ],
  plugins: {
    awesome: {
      options: {
        // A self-contained index.html (plus two small JSON summaries): CI uploads it in a few
        // requests, well within the lifetime of the short-lived GitHub OIDC token.
        singleFile: true,
        reportLanguage: "en",
        // `layer` is a label each suite's reporter adds: E2E, web unit, Storybook stories, gateway.
        groupBy: ["layer", "parentSuite", "suite", "subSuite"],
      },
    },
  },
});
