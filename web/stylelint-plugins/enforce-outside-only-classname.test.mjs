import path from "node:path";
import { fileURLToPath } from "node:url";

import stylelint from "stylelint";

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.join(path.dirname(pluginDir), "stylelint.config.mjs");
const fixture = path.join(
  pluginDir,
  "__fixtures__/outside-only/Parent.module.css",
);
const ruleName = "custom/enforce-outside-only-classname";

/** Lints `code` as the stylesheet of the Parent fixture, with the project's config. */
async function lint(code) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: fixture,
    configFile,
  });
  return results
    .flatMap((result) => result.warnings)
    .filter((w) => w.rule === ruleName);
}

const layer = (rules) => `@layer components {\n${rules}\n}\n`;

describe(ruleName, () => {
  it("lets a parent set a child's outside", async () => {
    const code = layer(`
  .Parent__Child {
    position: absolute;
    top: 0;
    inset-inline-end: var(--space-100);
    flex: none;
    order: 1;
    grid-area: cover;
    align-self: start;
    place-self: center;
    width: auto;
    max-width: 10rem;
    aspect-ratio: 1;
    margin-inline: calc(var(--space-100) * -1);
  }`);
    expect(await lint(code)).toEqual([]);
  });

  it("rejects the child's inside, naming the property and the component", async () => {
    const warnings = await lint(
      layer(".Parent__Child {\n  color: var(--color-text);\n}"),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.text).toContain('"color"');
    expect(warnings[0]?.text).toContain("<Child>");
  });

  it("finds classes passed inside clsx(...)", async () => {
    const code = layer(`
  .Parent__Other {
    padding: 0;
  }

  .Parent__Active {
    border-radius: 0;
  }`);
    expect((await lint(code)).map((w) => w.line)).toEqual([4, 8]);
  });

  it("follows nested & rules and @media", async () => {
    const code = layer(`
  .Parent__Root {
    & .Parent__Child {
      padding: 0;
    }
  }

  .Parent__Child {
    [data-layout="phone"] > & {
      border: 0;
    }

    @media (width >= 48rem) {
      font-size: var(--font-size-100);
    }
  }`);
    expect((await lint(code)).map((w) => w.line)).toEqual([5, 11, 15]);
  });

  it("ignores the parent's own elements, primitives and same-file components", async () => {
    const code = layer(`
  .Parent__Root {
    color: var(--color-text);
  }

  .Parent__Button {
    padding: 0;
  }

  .Parent__Local {
    padding: 0;
  }

  .Parent__Child + .Parent__Root {
    padding: 0;
  }`);
    expect(await lint(code)).toEqual([]);
  });

  it("reports a disable comment for the rule", async () => {
    const code = layer(`
  .Parent__Child {
    /* stylelint-disable-next-line ${ruleName} */
    color: var(--color-text);
  }`);
    const { results } = await stylelint.lint({
      code,
      codeFilename: fixture,
      configFile,
    });
    const texts = results
      .flatMap((result) => result.warnings)
      .map((w) => w.text);
    expect(texts.some((text) => text.includes(ruleName))).toBe(true);
  });
});
