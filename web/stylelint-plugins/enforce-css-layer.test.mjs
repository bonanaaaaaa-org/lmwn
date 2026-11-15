import path from "node:path";
import { fileURLToPath } from "node:url";

import stylelint from "stylelint";

const webDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configFile = path.join(webDir, "stylelint.config.mjs");
const ruleName = "custom/enforce-css-layer";

/** Lints `code` as if it lived at `relativePath` under web/, with the project's config. */
async function layerWarnings(relativePath, code) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: path.join(webDir, relativePath),
    configFile,
  });
  return results
    .flatMap((result) => result.warnings)
    .filter((w) => w.rule === ruleName);
}

const sheet = (layer) =>
  `@layer ${layer} {\n  .Foo__Root {\n    display: block;\n  }\n}\n`;

describe(ruleName, () => {
  it.each([
    ["src/components/common/Foo/Foo.module.css", "components"],
    ["src/components/layout/Foo/Foo.module.css", "layout"],
    ["src/features/guides/components/Foo/Foo.module.css", "features"],
  ])("accepts %s in @layer %s", async (file, layer) => {
    expect(
      await layerWarnings(file, `/* A comment. */\n${sheet(layer)}`),
    ).toEqual([]);
  });

  it.each([
    [
      "src/features/guides/components/Foo/Foo.module.css",
      "components",
      "features",
    ],
    ["src/components/layout/Foo/Foo.module.css", "features", "layout"],
    ["src/components/common/Foo/Foo.module.css", "layout", "components"],
  ])("rejects %s in @layer %s", async (file, layer, expected) => {
    const warnings = await layerWarnings(file, sheet(layer));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.text).toContain(`"@layer ${expected}"`);
  });

  it("rejects a rule outside any layer", async () => {
    const code = `${sheet("features")}.Foo__Extra {\n  display: block;\n}\n`;
    const warnings = await layerWarnings(
      "src/features/guides/components/Foo/Foo.module.css",
      code,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.line).toBe(6);
  });

  it("ignores stylesheets outside the mapped folders", async () => {
    expect(
      await layerWarnings("src/styles/Foo.module.css", sheet("base")),
    ).toEqual([]);
  });
});
