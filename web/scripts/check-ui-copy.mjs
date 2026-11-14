/**
 * UI copy guard, run by web `pnpm lint` (and so by CI):
 * 1. Thai copy: UI copy lives in the Paraglide catalog web/messages/th.json, so
 *    any Thai character in web/app or web/src outside THAI_ALLOWLIST fails.
 * 2. Dot access: messages are called as `m.key()`. Bracket access on the
 *    messages object (`m[key]`) in a file that imports `m` from Paraglide fails,
 *    since a runtime key loses type safety and tree-shaking.
 * 3. Catalog keys: every key in web/messages/th.json (except `$`-prefixed ones
 *    such as `$schema`) must match CATALOG_KEY_PATTERN, e.g. `notFound_title`.
 * 4. Inlang plugins: every local (`./`) module in project.inlang/settings.json
 *    must exist. A missing one makes Paraglide compile an empty catalog, exit 0.
 *
 * Usage (from anywhere):
 *   node scripts/check-ui-copy.mjs            # scan web/app, web/src and the catalog
 *   node scripts/check-ui-copy.mjs <files...> # check only these (lint-staged)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  ".mts",
  ".cts",
  ".json",
  ".mdx",
  ".css",
  ".html",
]);

/** Directory names never descended into, at any depth (installed or generated code). */
export const IGNORED_DIRS = new Set(["node_modules", ".react-router"]);

/**
 * Generated folders (relative to web/, trailing "/") that are skipped entirely.
 * Build output is skipped only at the web root (a nested `build` folder under src is
 * source and is scanned); Paraglide compiles the catalog into src/paraglide/.
 */
export const IGNORED_PATHS = ["build/", "dist/", "coverage/", "src/paraglide/"];

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

/** The inlang project settings, relative to web/. */
export const INLANG_SETTINGS_PATH = "project.inlang/settings.json";

/** Code files checked for bracket access on the messages object. */
export const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

/** `import { m } from ".../paraglide/messages(.js)"`, possibly among other names. */
const IMPORTS_MESSAGES =
  /import\s*(?:type\s+)?\{[^}]*\bm\b[^}]*\}\s*from\s*["'][^"']*paraglide\/messages(?:\.js)?["']/;

/** `m[`, `m?.[` or `m [` as an expression (not `xm[` or `obj.m[`). */
const BRACKET_ACCESS = /(?<![\w$.])m\s*(?:\?\.)?\s*\[/;

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
  "(e.g. notFound_title, app_skipLink_label); keys starting with '$' are ignored.";

export const DOT_ACCESS_HINT =
  "Call messages statically with dot access (m.notFound_title()); never build a key at runtime.";

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

/** Whether a web-relative path is code checked for bracket access on `m`. */
export function isDotAccessPath(path) {
  const segments = path.split("/");
  return (
    SCAN_ROOTS.includes(segments[0]) &&
    !isIgnoredPath(path) &&
    CODE_EXTENSIONS.has(extname(path)) &&
    !segments.slice(0, -1).some((segment) => IGNORED_DIRS.has(segment))
  );
}

/**
 * Pure check: in code files that import `m` from Paraglide's messages, return every
 * line with bracket access on it (`m[key]`, `m?.[key]`) as `{ path, line, column, text }`.
 */
export function findBracketAccess(files) {
  const violations = [];
  for (const { path, content } of files) {
    if (!isDotAccessPath(path) || !IMPORTS_MESSAGES.test(content)) continue;
    content.split(/\r?\n/).forEach((lineText, index) => {
      const match = BRACKET_ACCESS.exec(lineText);
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

/**
 * Pure check: given the inlang settings' JSON text, return the local (`./`) entries of
 * `modules` for which `exists(path)` is false. Paths are relative to web/, the folder
 * that holds project.inlang (inlang resolves them from there).
 */
export function findMissingModules(jsonText, exists) {
  let settings;
  try {
    settings = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `web/${INLANG_SETTINGS_PATH} is not valid JSON: ${error.message}`,
      { cause: error },
    );
  }
  const modules = Array.isArray(settings?.modules) ? settings.modules : [];
  return modules.filter(
    (module) =>
      typeof module === "string" && module.startsWith("./") && !exists(module),
  );
}

/** Every file under web/app and web/src passing `include`, as web-relative paths. */
function listFiles(webRoot, include) {
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
      } else if (entry.isFile() && include(path)) {
        found.push(path);
      }
    }
  };
  for (const root of SCAN_ROOTS) walk(resolve(webRoot, root));
  return found.sort();
}

/** Every code file under web/app and web/src checked for bracket access. */
export function listDotAccessFiles(webRoot = WEB_ROOT) {
  return listFiles(webRoot, isDotAccessPath);
}

/** Every scanned file under web/app and web/src, as web-relative paths. */
export function listScannedFiles(webRoot = WEB_ROOT) {
  return listFiles(webRoot, isScannedPath);
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

export function formatDotAccessReport(violations, fileCount) {
  if (violations.length === 0) {
    return `Dot access check: no bracket access on m in ${fileCount} code file(s).`;
  }
  return [
    ...violations.map(
      ({ path, line, column, text }) =>
        `web/${path}:${line}:${column}  ${text}`,
    ),
    "",
    `Dot access check: ${violations.length} line(s) access messages with brackets.`,
    DOT_ACCESS_HINT,
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
  const codePaths = argPaths
    ? argPaths.filter(isDotAccessPath)
    : listDotAccessFiles(webRoot);
  const checkCatalog = argPaths === null || argPaths.includes(CATALOG_PATH);
  const checkSettings =
    argPaths === null || argPaths.includes(INLANG_SETTINGS_PATH);
  let exitCode = 0;
  const read = (path) => readFileSync(resolve(webRoot, path), "utf8");

  const files = paths.map((path) => ({ path, content: read(path) }));
  const violations = findThaiViolations(files);
  const report = formatReport(violations, files.length);
  if (violations.length > 0) {
    logError(report);
    exitCode = 1;
  } else {
    log(report);
  }

  const codeFiles = codePaths.map((path) => ({ path, content: read(path) }));
  const bracketAccess = findBracketAccess(codeFiles);
  const dotReport = formatDotAccessReport(bracketAccess, codeFiles.length);
  if (bracketAccess.length > 0) {
    logError(dotReport);
    exitCode = 1;
  } else {
    log(dotReport);
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

  if (checkSettings) {
    try {
      const missing = findMissingModules(read(INLANG_SETTINGS_PATH), (module) =>
        existsSync(resolve(webRoot, module)),
      );
      if (missing.length > 0) {
        logError(
          [
            ...missing.map(
              (module) =>
                `web/${INLANG_SETTINGS_PATH}: module "${module}" not found`,
            ),
            "",
            `Inlang plugin check: ${missing.length} local module(s) missing. Paraglide would compile an empty catalog; run pnpm install or fix the path (relative to web/).`,
          ].join("\n"),
        );
        exitCode = 1;
      } else {
        log(
          `Inlang plugin check: every local module in web/${INLANG_SETTINGS_PATH} exists.`,
        );
      }
    } catch (error) {
      logError(
        error?.code === "ENOENT"
          ? `Inlang plugin check: web/${INLANG_SETTINGS_PATH} not found.`
          : `Inlang plugin check: ${error.message}`,
      );
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
