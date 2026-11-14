/**
 * Pre-commit: lint with auto-fix, then format (last, so fixes come out formatted) — staged files only.
 * lint-staged re-stages the fixes; anything left unfixable fails the commit.
 * Each tool runs from its package directory so it picks up that package's config.
 */
const quote = (files) => files.map((f) => JSON.stringify(f)).join(" ");
const inWeb = (cmd) => (files) => `pnpm --dir web exec ${cmd} ${quote(files)}`;
const inE2e = (cmd) => (files) => `pnpm --dir e2e exec ${cmd} ${quote(files)}`;
const inGateway = (cmd) => (files) =>
  `uv run --directory api-gateway ${cmd} ${quote(files)}`;

export default {
  "web/**/*.{ts,tsx,mts,cts,js,mjs,cjs}": [
    inWeb("oxlint --fix"),
    inWeb("oxfmt --no-error-on-unmatched-pattern"),
  ],
  "web/**/*.css": [
    inWeb("stylelint --fix"),
    inWeb("oxfmt --no-error-on-unmatched-pattern"),
  ],
  "web/**/*.{json,jsonc,md}": [inWeb("oxfmt --no-error-on-unmatched-pattern")],
  // UI copy guard (read-only): no hardcoded Thai outside the catalog. The script
  // skips files outside web/app and web/src and its own allowlist.
  "web/{app,src}/**/*.{ts,tsx,js,jsx,mjs,cjs,mdx,css,html}": (files) =>
    `node web/scripts/check-ui-copy.mjs ${quote(files)}`,
  // Catalog key check (keys mirror test ID paths), when the catalog itself changes.
  "web/messages/th.json": (files) =>
    `node web/scripts/check-ui-copy.mjs ${quote(files)}`,
  "e2e/**/*.{ts,mts,js,mjs}": [
    inE2e("oxlint --fix"),
    inE2e("oxfmt --no-error-on-unmatched-pattern"),
  ],
  "e2e/**/*.json": [inE2e("oxfmt --no-error-on-unmatched-pattern")],
  "api-gateway/**/*.py": [
    inGateway("ruff check --fix"),
    inGateway("ruff format"),
  ],
};
