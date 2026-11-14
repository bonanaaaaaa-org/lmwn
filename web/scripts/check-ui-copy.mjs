/**
 * UI copy guard, run by web `pnpm lint` (and so by CI):
 * 1. Thai copy: UI copy lives in the Paraglide catalog web/messages/th.json, so
 *    any Thai character in web/app or web/src outside THAI_ALLOWLIST fails.
 * 2. Catalog keys: every key in web/messages/th.json (except `$`-prefixed ones
 *    such as `$schema`) must match CATALOG_KEY_PATTERN, e.g. `notFound_title`.
 *
 * Usage (from anywhere):
 *   node scripts/check-ui-copy.mjs            # scan web/app, web/src and the catalog
 *   node scripts/check-ui-copy.mjs <files...> # check only these (lint-staged)
 */
import { readdirSync, readFileSync } from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The web package root (this file lives in web/scripts/). */
export const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Folders (relative to web/) that are scanned. */
export const SCAN_ROOTS = ["app", "src"];

/** File extensions that are scanned; everything else is ignored. */
export const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mdx",
  ".css",
  ".html",
]);

/** Directory names never descended into (generated or installed code). */
export const IGNORED_DIRS = new Set([
  "node_modules",
  "build",
  "dist",
  "coverage",
  ".react-router",
]);

/**
 * Generated folders (relative to web/, trailing "/") that are skipped entirely,
 * like build output. Paraglide compiles the catalog into src/paraglide/.
 */
export const IGNORED_PATHS = ["src/paraglide/"];

/**
 * The only places in web/app and web/src where Thai may appear, relative to
 * web/ with forward slashes. An entry ending in "/" allows everything under it.
 * (The catalog web/messages/th.json is outside the scanned folders.)
 */
export const THAI_ALLOWLIST = [
  // Sample gateway-like data (Guide/Restaurant names) for tests and stories.
  "src/test-utils/fixtures/",
];

/** The Paraglide message catalog, relative to web/. */
export const CATALOG_PATH = "messages/th.json";

/** camelCase segments joined by "_", at least two: component and role. */
export const CATALOG_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(_[a-z][a-zA-Z0-9]*)+$/;

/** Thai Unicode block, U+0E00 to U+0E7F (built from code points so formatters keep it readable). */
const THAI_CHAR = new RegExp(
  `[${String.fromCharCode(0x0e00)}-${String.fromCharCode(0x0e7f)}]`,
  "u",
);

export const CATALOG_HINT =
  "Move UI copy into the Paraglide catalog web/messages/th.json and render it with m.key(); " +
  "sample gateway data for tests and stories belongs in web/src/test-utils/fixtures/. " +
  "The allowlist is THAI_ALLOWLIST in web/scripts/check-ui-copy.mjs.";

export const KEY_HINT =
  "Catalog keys are camelCase segments joined by '_', at least a component and a role " +
  "(e.g. notFound_title, appShell_skipLink_label); keys starting with '$' are ignored.";

const toPosix = (path) => path.split(sep).join("/");

export function isAllowlisted(path) {
  return THAI_ALLOWLIST.some((entry) =>
    entry.endsWith("/") ? path.startsWith(entry) : path === entry,
  );
}

const isIgnoredPath = (path) =>
  IGNORED_PATHS.some((prefix) => `${path}/`.startsWith(prefix));

/** Whether a web-relative path (forward slashes) is subject to the Thai check. */
export function isScannedPath(path) {
  const segments = path.split("/");
  return (
    SCAN_ROOTS.includes(segments[0]) &&
    !isIgnoredPath(path) &&
    SCANNED_EXTENSIONS.has(extname(path)) &&
    !segments.slice(0, -1).some((segment) => IGNORED_DIRS.has(segment)) &&
    !isAllowlisted(path)
  );
}

/**
 * Pure check: given files as `{ path, content }` (path relative to web/, forward
 * slashes), return every Thai occurrence in a scanned, non-allowlisted file, one
 * per line, as `{ path, line, column, text }` (1-based line and column, text trimmed).
 */
export function findThaiViolations(files) {
  const violations = [];
  for (const { path, content } of files) {
    if (!isScannedPath(path)) continue;
    content.split(/\r?\n/).forEach((lineText, index) => {
      const match = THAI_CHAR.exec(lineText);
      if (match) {
        violations.push({
          path,
          line: index + 1,
          column: match.index + 1,
          text: lineText.trim(),
        });
      }
    });
  }
  return violations;
}

/** Every scanned file under web/app and web/src, as web-relative paths. */
export function listScannedFiles(webRoot = WEB_ROOT) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      const path = toPosix(relative(webRoot, full));
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !isIgnoredPath(path)) walk(full);
      } else if (entry.isFile() && isScannedPath(path)) {
        found.push(path);
      }
    }
  };
  for (const root of SCAN_ROOTS) walk(resolve(webRoot, root));
  return found.sort();
}

/**
 * Pure check: given the catalog's JSON text, return its keys that break
 * CATALOG_KEY_PATTERN (keys starting with "$", such as "$schema", are ignored).
 * Throws a clear Error if the text is not a JSON object.
 */
export function findBadCatalogKeys(jsonText, path = CATALOG_PATH) {
  let catalog;
  try {
    catalog = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`web/${path} is not valid JSON: ${error.message}`, {
      cause: error,
    });
  }
  if (
    catalog === null ||
    typeof catalog !== "object" ||
    Array.isArray(catalog)
  ) {
    throw new Error(`web/${path} must be a JSON object of message keys.`);
  }
  return Object.keys(catalog).filter(
    (key) => !key.startsWith("$") && !CATALOG_KEY_PATTERN.test(key),
  );
}

/** Read the catalog's text; a missing file is an error, never a silent pass. */
export function readCatalog(webRoot = WEB_ROOT, path = CATALOG_PATH) {
  try {
    return readFileSync(resolve(webRoot, path), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Catalog web/${path} not found: UI copy must live in the Paraglide catalog.`,
        { cause: error },
      );
    }
    throw error;
  }
}

/** Turn CLI file arguments (absolute or cwd-relative) into web-relative paths. */
export function toWebPaths(
  args,
  { webRoot = WEB_ROOT, cwd = process.cwd() } = {},
) {
  return args.map((arg) =>
    toPosix(relative(webRoot, isAbsolute(arg) ? arg : resolve(cwd, arg))),
  );
}

export function formatKeyReport(badKeys) {
  return [
    ...badKeys.map((key) => `web/${CATALOG_PATH}: bad key "${key}"`),
    "",
    `Catalog key check: ${badKeys.length} key(s) do not match ${CATALOG_KEY_PATTERN}.`,
    KEY_HINT,
  ].join("\n");
}

export function formatReport(violations, fileCount) {
  if (violations.length === 0) {
    return `Thai copy guard: no hardcoded Thai in ${fileCount} scanned file(s) under web/app and web/src.`;
  }
  const lines = violations.map(
    ({ path, line, column, text }) => `web/${path}:${line}:${column}  ${text}`,
  );
  return [
    ...lines,
    "",
    `Thai copy guard: ${violations.length} line(s) with hardcoded Thai in ${new Set(violations.map((v) => v.path)).size} file(s).`,
    CATALOG_HINT,
  ].join("\n");
}

export function runCli({
  args = process.argv.slice(2),
  webRoot = WEB_ROOT,
  cwd = process.cwd(),
  log = (message) => process.stdout.write(`${message}\n`),
  logError = (message) => process.stderr.write(`${message}\n`),
} = {}) {
  const argPaths = args.length > 0 ? toWebPaths(args, { webRoot, cwd }) : null;
  // Full run: every scanned file plus the catalog. With file arguments: only
  // those files, and the catalog only when it is one of them.
  const paths = argPaths
    ? argPaths.filter(isScannedPath)
    : listScannedFiles(webRoot);
  const checkCatalog = argPaths === null || argPaths.includes(CATALOG_PATH);
  let exitCode = 0;

  const files = paths.map((path) => ({
    path,
    content: readFileSync(resolve(webRoot, path), "utf8"),
  }));
  const violations = findThaiViolations(files);
  const report = formatReport(violations, files.length);
  if (violations.length > 0) {
    logError(report);
    exitCode = 1;
  } else {
    log(report);
  }

  if (checkCatalog) {
    try {
      const badKeys = findBadCatalogKeys(readCatalog(webRoot));
      if (badKeys.length > 0) {
        logError(formatKeyReport(badKeys));
        exitCode = 1;
      } else {
        log(
          `Catalog key check: every key in web/${CATALOG_PATH} is well formed.`,
        );
      }
    } catch (error) {
      logError(`Catalog key check: ${error.message}`);
      exitCode = 1;
    }
  }
  return exitCode;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = runCli();
}
