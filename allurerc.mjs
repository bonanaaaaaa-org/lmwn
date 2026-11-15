import { defineConfig } from "allure";

// One combined Allure report from every suite's results: `pnpm allure` locally, and the
// `Allure report` job in CI, which uploads it to the shared report host (README, Test reports).
// Each suite writes into its own package; a missing directory (a suite that didn't run) is skipped.
export default defineConfig({
  name: "Guide to Hidden Gems",
  output: "./allure-report",
  // Test history: each `allure generate` reads the earlier runs from this file and appends one
  // line for this run, which gives the report its trend charts and each test's history (and
  // flaky / new / regressed marks). CI keeps the file between runs in the Actions cache (ci.yml,
  // Allure report); locally it collects your own runs. Git-ignored.
  historyPath: "./allure-history/history.jsonl",
  // The single-file report embeds the history it read (roughly 2 MB per run for every suite), so
  // keep the last 5 runs: enough for the trends, small enough to upload and open quickly.
  historyLimit: 5,
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
