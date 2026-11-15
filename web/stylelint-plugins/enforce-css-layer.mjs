import stylelint from "stylelint";
import path from "node:path";

const ruleName = "custom/enforce-css-layer";

const messages = stylelint.utils.ruleMessages(ruleName, {
  wrongLayer: (actual, expected, folder) =>
    `Stylesheets under "src/${folder}/" go in "@layer ${expected}", not "@layer ${actual}".`,
  outsideLayer: (expected, folder) =>
    `Stylesheets under "src/${folder}/" put everything inside "@layer ${expected} { ... }".`,
});

const meta = { url: "" };

/**
 * Each folder's CSS Modules sit in their own cascade layer, so a higher folder can restyle a
 * lower one through `className` without winning on specificity or bundle order (#69).
 *
 * The primary option maps a folder under `src/` to its layer, e.g.
 * `{ "components/common": "components", "features": "features" }`. A `.module.css` file under
 * one of those folders must hold only comments and `@layer <its layer> { ... }` blocks at its
 * top level. Files outside every listed folder are not checked.
 */
/** @type {import('stylelint').Rule<Record<string, string>>} */
const ruleFunction = (primary) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: (value) =>
        typeof value === "object" &&
        value !== null &&
        Object.values(value).every((layer) => typeof layer === "string"),
    });
    if (!validOptions) return;

    const filePath = root.source?.input?.file;
    if (!filePath?.endsWith(".module.css")) return;

    const normalized = filePath.split(path.sep).join("/");
    const folder = Object.keys(primary).find((key) =>
      normalized.includes(`/src/${key}/`),
    );
    if (!folder) return;
    const expected = primary[folder];

    root.each((node) => {
      if (node.type === "comment") return;
      if (node.type === "atrule" && node.name === "layer" && node.nodes) {
        if (node.params.trim() !== expected) {
          stylelint.utils.report({
            message: messages.wrongLayer(node.params.trim(), expected, folder),
            node,
            word: node.params,
            result,
            ruleName,
          });
        }
        return;
      }
      stylelint.utils.report({
        message: messages.outsideLayer(expected, folder),
        node,
        result,
        ruleName,
      });
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
