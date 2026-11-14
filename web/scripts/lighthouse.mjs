/**
 * Lighthouse audit for the Guide Index and a Guide page, with the mobile and desktop
 * presets, run by `pnpm lighthouse` (from web/ or the repo root).
 *
 * By default it audits the production build (`build/client`) through `vite preview` on
 * :3000, the origin the local gateway allows for CORS. The gateway and the Data Server must
 * already be running (`pnpm --filter api-gateway dev`); the Guide page audited is the first
 * Guide the gateway returns.
 *
 * Each page and preset is audited in both colour themes (dark mode, #47): Chrome runs with
 * `--force-dark-mode` for the dark audit, which makes `prefers-color-scheme: dark` match.
 * `--theme light` or `--theme dark` audits one only.
 *
 * Every page × preset × theme runs `--runs` times (default 5) in a fresh headless Chrome, and the
 * median run by Performance is kept. Reports (HTML and JSON) go to web/lighthouse-reports/.
 * It prints a Markdown table and exits 1 if any score misses its target (TARGETS below;
 * `--min <score>` replaces every target with one score).
 *
 * Usage:
 *   pnpm lighthouse                                   # pnpm build, then audit the local preview
 *   node scripts/lighthouse.mjs                       # audit an existing build
 *   node scripts/lighthouse.mjs --runs 3 --min 100
 *   node scripts/lighthouse.mjs --theme dark
 *   node scripts/lighthouse.mjs --base-url https://hidden-gems.bonanaaaaaa.dev \
 *     --api-url https://api-hidden-gems.bonanaaaaaa.dev   # audit a deployed site, no preview
 *
 * Chrome: CHROME_PATH if set, otherwise Playwright's Chromium (`pnpm exec playwright install chromium`).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const log = (text) => process.stdout.write(`${text}\n`);
const logError = (text) => process.stderr.write(`${text}\n`);

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEW_PORT = 3000;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const PRESETS = ["mobile", "desktop"];
const THEMES = ["light", "dark"];

/**
 * The targets agreed for #16 (see the spec's Measurable success criteria): 100 everywhere,
 * except mobile Performance at 90 or more. Lighthouse's mobile preset simulates a mid-range
 * phone on slow 4G, where 100 would need the whole page (JS, CSS, fonts, data and cover)
 * under about 220 KB before the cover paints.
 */
const TARGETS = {
  mobile: {
    performance: 90,
    accessibility: 100,
    "best-practices": 100,
    seo: 100,
  },
  desktop: {
    performance: 100,
    accessibility: 100,
    "best-practices": 100,
    seo: 100,
  },
};

const { values: args } = parseArgs({
  options: {
    "base-url": { type: "string" },
    "api-url": { type: "string" },
    runs: { type: "string", default: "5" },
    min: { type: "string" },
    theme: { type: "string", default: "both" },
    out: { type: "string", default: join(WEB_ROOT, "lighthouse-reports") },
  },
});

const runs = Number(args.runs);
if (!Number.isInteger(runs) || runs < 1) {
  throw new Error(
    `--runs must be a whole number of at least 1, not "${args.runs}"`,
  );
}
if (
  args.min !== undefined &&
  !(Number(args.min) >= 0 && Number(args.min) <= 100)
) {
  throw new Error(`--min must be a score from 0 to 100, not "${args.min}"`);
}
if (!["both", ...THEMES].includes(args.theme)) {
  throw new Error(`--theme must be light, dark or both, not "${args.theme}"`);
}
const themes = args.theme === "both" ? THEMES : [args.theme];
const targetFor = (preset, category) =>
  args.min === undefined ? TARGETS[preset][category] : Number(args.min);
const apiUrl = (
  args["api-url"] ??
  process.env.VITE_API_BASE_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`);
    await new Promise((done) => setTimeout(done, 250));
  }
}

async function isServing(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function startPreview(baseUrl) {
  if (!existsSync(join(WEB_ROOT, "build/client/index.html"))) {
    throw new Error("No production build: run `pnpm build` in web/ first.");
  }
  // Something else on :3000 (often `pnpm dev`) would be audited instead of the build.
  if (await isServing(baseUrl)) {
    throw new Error(
      `${baseUrl} is already in use (pnpm dev?). Stop it so the audit runs against the production build.`,
    );
  }
  // Its own process group, so stopping it also stops anything it spawned.
  return spawn(
    join(WEB_ROOT, "node_modules/.bin/vite"),
    ["preview", "--port", String(PREVIEW_PORT), "--strictPort"],
    { cwd: WEB_ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true },
  );
}

async function firstGuideId() {
  let response;
  try {
    response = await fetch(`${apiUrl}/guides`);
  } catch {
    throw new Error(
      `The gateway at ${apiUrl} is not reachable. Start it with the Data Server: pnpm --filter api-gateway dev`,
    );
  }
  if (!response.ok)
    throw new Error(`GET ${apiUrl}/guides → ${response.status}`);
  const { items } = await response.json();
  if (!items?.length) throw new Error("The gateway returned no Guides.");
  return items[0].id;
}

async function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const { chromium } = await import("playwright");
  return chromium.executablePath();
}

async function audit(url, preset, theme, executable) {
  const { default: lighthouse } = await import("lighthouse");
  const { launch } = await import("chrome-launcher");
  const config =
    preset === "desktop"
      ? (await import("lighthouse/core/config/desktop-config.js")).default
      : undefined;
  const chrome = await launch({
    chromePath: executable,
    chromeFlags: [
      "--headless=new",
      "--no-first-run",
      ...(theme === "dark" ? ["--force-dark-mode"] : []),
    ],
  });
  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: ["html", "json"],
        logLevel: "error",
        onlyCategories: CATEGORIES,
      },
      config,
    );
    if (!result) throw new Error(`Lighthouse returned nothing for ${url}`);
    return result;
  } finally {
    await chrome.kill();
  }
}

const scoresOf = (lhr) =>
  Object.fromEntries(
    CATEGORIES.map((id) => [
      id,
      Math.round((lhr.categories[id].score ?? 0) * 100),
    ]),
  );

async function main() {
  let preview;
  const baseUrl = (
    args["base-url"] ?? `http://localhost:${PREVIEW_PORT}`
  ).replace(/\/$/, "");
  try {
    const guideId = await firstGuideId();
    if (!args["base-url"]) {
      preview = await startPreview(baseUrl);
      const exited = new Promise((_, reject) =>
        preview.once("exit", (code) =>
          reject(
            new Error(`vite preview exited (code ${code}) before it was ready`),
          ),
        ),
      );
      // Stopping the preview at the end also fires "exit"; that rejection is expected.
      exited.catch(() => {});
      await Promise.race([waitFor(baseUrl, 30_000), exited]);
    }
    const pages = [
      { name: "guide-index", label: "Guide Index", path: "/" },
      { name: "guide", label: "Guide page", path: `/guides/${guideId}` },
    ];
    const executable = await chromePath();
    mkdirSync(args.out, { recursive: true });

    const rows = [];
    for (const page of pages) {
      for (const preset of PRESETS) {
        for (const theme of themes) {
          const url = `${baseUrl}${page.path}`;
          const results = [];
          for (let run = 1; run <= runs; run += 1) {
            const result = await audit(url, preset, theme, executable);
            const scores = scoresOf(result.lhr);
            log(
              `${page.label} · ${preset} · ${theme} · run ${run}/${runs}: ${CATEGORIES.map((c) => `${c} ${scores[c]}`).join(", ")}`,
            );
            results.push(result);
          }
          results.sort(
            (a, b) =>
              (a.lhr.categories.performance.score ?? 0) -
              (b.lhr.categories.performance.score ?? 0),
          );
          const median = results[Math.floor((results.length - 1) / 2)];
          const base = join(args.out, `${page.name}-${preset}-${theme}`);
          writeFileSync(`${base}.html`, median.report[0]);
          writeFileSync(`${base}.json`, median.report[1]);
          const metrics = median.lhr.audits;
          rows.push({
            page: page.label,
            preset,
            theme,
            ...scoresOf(median.lhr),
            lcp: metrics["largest-contentful-paint"].displayValue,
            cls: metrics["cumulative-layout-shift"].displayValue,
          });
        }
      }
    }

    const header = `| Page | Preset | Theme | Performance | Accessibility | Best Practices | SEO | LCP | CLS |`;
    const lines = rows.map(
      (r) =>
        `| ${r.page} | ${r.preset} | ${r.theme} | ${r.performance} | ${r.accessibility} | ${r["best-practices"]} | ${r.seo} | ${r.lcp} | ${r.cls} |`,
    );
    log(
      `\nLighthouse (median of ${runs}) — ${baseUrl}\n\n${header}\n|---|---|---|---|---|---|---|---|---|\n${lines.join("\n")}\n\nReports: ${args.out}`,
    );
    const misses = rows.flatMap((r) =>
      CATEGORIES.filter((c) => r[c] < targetFor(r.preset, c)).map(
        (c) =>
          `${r.page} · ${r.preset} · ${r.theme} · ${c}: ${r[c]} (target ${targetFor(r.preset, c)})`,
      ),
    );
    if (misses.length > 0) {
      logError(`\nBelow target:\n${misses.join("\n")}`);
      process.exitCode = 1;
    } else {
      log("\nEvery score meets its target.");
    }
  } finally {
    if (preview?.pid && preview.exitCode === null) {
      process.kill(-preview.pid, "SIGTERM");
    }
  }
}

main()
  .catch((error) => {
    logError(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // Lighthouse can leave handles open; don't wait on them.
  .finally(() => process.exit());
