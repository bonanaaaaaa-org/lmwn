import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import {
  findBadCatalogKeys,
  findThaiViolations,
  isScannedPath,
  listScannedFiles,
  readCatalog,
  runCli,
  THAI_ALLOWLIST,
  toWebPaths,
} from "./check-ui-copy.mjs";

// Thai built from code points so this file stays free of Thai characters itself.
const THAI = String.fromCharCode(
  0x0e2a,
  0x0e27,
  0x0e31,
  0x0e2a,
  0x0e14,
  0x0e35,
); // "hello"

/** A well-formed catalog for CLI trees. */
const CATALOG = JSON.stringify({
  $schema: "https://inlang.com/schema/inlang-message-format",
  notFound_title: THAI,
});

const tempDirs = [];
after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/** Create a throwaway web/ tree from `{ "relative/path": "content" }`. */
function makeTree(files) {
  const root = mkdtempSync(join(tmpdir(), "check-ui-copy-"));
  tempDirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function captureCli(options) {
  const out = [];
  const err = [];
  const code = runCli({
    log: (m) => out.push(m),
    logError: (m) => err.push(m),
    ...options,
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

test("reports a violation with its 1-based line and column and the trimmed line", () => {
  const content = [
    "export function Title() {",
    `  return <h1 aria-label="x">${THAI}</h1>;`,
    "}",
  ].join("\n");
  const violations = findThaiViolations([
    { path: "src/components/Title.tsx", content },
  ]);
  assert.deepEqual(violations, [
    {
      path: "src/components/Title.tsx",
      line: 2,
      column: 29,
      text: `return <h1 aria-label="x">${THAI}</h1>;`,
    },
  ]);
});

test("flags Thai in comments and in every scanned extension", () => {
  for (const ext of [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".mdx",
    ".css",
    ".html",
  ]) {
    const violations = findThaiViolations([
      { path: `app/file${ext}`, content: `// ${THAI}` },
    ]);
    assert.equal(violations.length, 1, ext);
    assert.equal(violations[0].column, 4, ext);
  }
});

test("reports one violation per offending line, handling CRLF", () => {
  const content = `a\r\n${THAI} ${THAI}\r\nb ${THAI}\r\n`;
  const violations = findThaiViolations([{ path: "src/x.ts", content }]);
  assert.deepEqual(
    violations.map(({ line, column }) => [line, column]),
    [
      [2, 1],
      [3, 3],
    ],
  );
});

test("allowlists only the test fixtures", () => {
  assert.deepEqual(THAI_ALLOWLIST, ["src/test-utils/fixtures/"]);
  const files = [
    { path: "src/test-utils/fixtures/guides.ts", content: THAI },
    {
      path: "src/test-utils/fixtures/nested/restaurants.json.ts",
      content: THAI,
    },
  ];
  assert.deepEqual(findThaiViolations(files), []);
  // Only the fixtures folder is exempt; the old TS catalog path is not.
  assert.equal(isScannedPath("src/i18n/locales/th.ts"), true);
  assert.equal(isScannedPath("src/test-utils/server.ts"), true);
  assert.equal(isScannedPath("src/test-utils/fixtures-extra.ts"), true);
});

test("ignores non-scanned extensions and paths outside app/ and src/", () => {
  const files = [
    { path: "src/data.json", content: THAI },
    { path: "src/notes.md", content: THAI },
    { path: "src/image.svg", content: THAI },
    { path: "messages/th.json", content: THAI },
    { path: "scripts/tool.mjs", content: THAI },
    { path: "e2e.ts", content: THAI },
  ];
  assert.deepEqual(findThaiViolations(files), []);
});

test("ignores node_modules and build output", () => {
  for (const path of [
    "src/node_modules/pkg/index.js",
    "app/build/client/index.js",
    "src/dist/out.js",
    "app/.react-router/types/x.ts",
    "src/coverage/lcov.js",
  ]) {
    assert.equal(isScannedPath(path), false, path);
  }

  const root = makeTree({
    "src/node_modules/pkg/index.js": THAI,
    "app/build/client/index.js": THAI,
    "build/server/index.js": THAI,
    "node_modules/pkg/index.js": THAI,
    "src/ok.ts": "export const ok = true;\n",
  });
  assert.deepEqual(listScannedFiles(root), ["src/ok.ts"]);
});

test("skips Paraglide's generated src/paraglide/ entirely", () => {
  for (const path of [
    "src/paraglide/messages.js",
    "src/paraglide/messages/_index.js",
    "src/paraglide/runtime.d.ts",
  ]) {
    assert.equal(isScannedPath(path), false, path);
  }
  assert.deepEqual(
    findThaiViolations([
      { path: "src/paraglide/messages/th.js", content: THAI },
    ]),
    [],
  );
  // Only that folder: a similarly named one elsewhere is still scanned.
  assert.equal(isScannedPath("src/paraglide-utils/x.ts"), true);
  assert.equal(isScannedPath("app/paraglide/x.ts"), true);

  const root = makeTree({
    "src/paraglide/messages/th.js": `export const t = () => "${THAI}";\n`,
    "src/paraglide/runtime.js": `// ${THAI}\n`,
    "src/ok.ts": "export const ok = true;\n",
  });
  assert.deepEqual(listScannedFiles(root), ["src/ok.ts"]);
});

test("accepts well-formed catalog keys and ignores $-prefixed ones", () => {
  const text = JSON.stringify({
    $schema: "https://inlang.com/schema/inlang-message-format",
    $anything: "x",
    notFound_title: "a",
    appShell_skipLink_label: "b",
    guide_restaurant2_rating: "c",
    errorPanel_retryButton_aria: "d",
  });
  assert.deepEqual(findBadCatalogKeys(text), []);
});

test("reports every malformed catalog key", () => {
  const bad = [
    "NotFound_title",
    "notfound",
    "not-found_title",
    "notFound__title",
    "notFound_",
    "_notFound_title",
    "notFound_Title",
    "notFound_title.x",
    "2fa_title",
  ];
  const text = JSON.stringify(
    Object.fromEntries([["notFound_title", "ok"], ...bad.map((k) => [k, "x"])]),
  );
  assert.deepEqual(findBadCatalogKeys(text), bad);
});

test("catalog errors are clear: missing file, invalid JSON, not an object", () => {
  const root = makeTree({ "src/ok.ts": "export const ok = 1;\n" });
  assert.throws(
    () => readCatalog(root),
    /Catalog web\/messages\/th\.json not found/,
  );
  assert.throws(() => findBadCatalogKeys("{ nope"), /not valid JSON/);
  assert.throws(() => findBadCatalogKeys("[]"), /must be a JSON object/);
  assert.throws(() => findBadCatalogKeys("null"), /must be a JSON object/);
});

test("CLI passes on a clean tree with a one-line summary", () => {
  const root = makeTree({
    "app/root.tsx": "export default function Root() { return null; }\n",
    "messages/th.json": CATALOG,
    "src/paraglide/messages.js": `export const t = () => "${THAI}";\n`,
    "src/test-utils/fixtures/guide.ts": `export const name = "${THAI}";\n`,
    "src/styles.css": ".a { color: red; }\n",
  });
  const { code, out, err } = captureCli({ args: [], webRoot: root });
  assert.equal(code, 0);
  assert.equal(err, "");
  const [thaiLine, keyLine, ...rest] = out.split("\n");
  assert.deepEqual(rest, []);
  assert.match(thaiLine, /no hardcoded Thai in 2 scanned file\(s\)/);
  assert.match(keyLine, /every key in web\/messages\/th\.json is well formed/);
});

test("CLI fails when the catalog is missing, even with no Thai", () => {
  const root = makeTree({ "src/ok.ts": "export const ok = 1;\n" });
  const { code, err } = captureCli({ args: [], webRoot: root });
  assert.equal(code, 1);
  assert.match(err, /Catalog web\/messages\/th\.json not found/);
});

test("CLI fails and lists each bad catalog key", () => {
  const root = makeTree({
    "messages/th.json": JSON.stringify({
      $schema: "x",
      notFound_title: "ok",
      NotFound_title: "bad",
      notfound: "bad",
    }),
    "src/ok.ts": "export const ok = 1;\n",
  });
  const { code, err } = captureCli({ args: [], webRoot: root });
  assert.equal(code, 1);
  assert.match(err, /^web\/messages\/th\.json: bad key "NotFound_title"$/m);
  assert.match(err, /^web\/messages\/th\.json: bad key "notfound"$/m);
  assert.doesNotMatch(err, /"notFound_title"|\$schema/);
  assert.match(err, /2 key\(s\) do not match/);
});

test("CLI fails with path:line:col, the line and a catalog hint", () => {
  const root = makeTree({
    "app/routes/home.tsx": `export default function Home() {\n  return <p>${THAI}</p>;\n}\n`,
    "src/ok.ts": "export const ok = 1;\n",
    "messages/th.json": CATALOG,
  });
  const { code, err } = captureCli({ args: [], webRoot: root });
  assert.equal(code, 1);
  assert.match(
    err,
    new RegExp(`^web/app/routes/home\\.tsx:2:13  return <p>${THAI}</p>;$`, "m"),
  );
  assert.match(err, /1 line\(s\) with hardcoded Thai in 1 file\(s\)/);
  assert.match(err, /web\/messages\/th\.json and render it with m\.key\(\)/);
});

test("CLI with file arguments checks only those scanned files (lint-staged)", () => {
  const root = makeTree({
    "src/bad.tsx": `const a = "${THAI}";\n`,
    "src/other-bad.tsx": `const b = "${THAI}";\n`,
    "src/test-utils/fixtures/guide.ts": `export const name = "${THAI}";\n`,
  });
  assert.deepEqual(
    toWebPaths(
      [
        join(root, "src/bad.tsx"),
        "src/test-utils/fixtures/guide.ts",
        "README.md",
      ],
      {
        webRoot: root,
        cwd: root,
      },
    ),
    ["src/bad.tsx", "src/test-utils/fixtures/guide.ts", "README.md"],
  );
  const failing = captureCli({
    args: [join(root, "src/bad.tsx")],
    webRoot: root,
  });
  assert.equal(failing.code, 1);
  assert.doesNotMatch(failing.err, /other-bad/);
  // No catalog in this tree: file-argument runs skip the key check unless the
  // catalog itself is passed.
  assert.doesNotMatch(failing.err, /Catalog key check/);
  const passing = captureCli({
    args: [join(root, "src/test-utils/fixtures/guide.ts")],
    webRoot: root,
  });
  assert.equal(passing.code, 0);
});

test("CLI with the catalog as a file argument runs the key check", () => {
  const root = makeTree({
    "messages/th.json": JSON.stringify({ "not-found_title": "x" }),
  });
  const { code, err } = captureCli({
    args: [join(root, "messages/th.json")],
    webRoot: root,
  });
  assert.equal(code, 1);
  assert.match(err, /bad key "not-found_title"/);
});
