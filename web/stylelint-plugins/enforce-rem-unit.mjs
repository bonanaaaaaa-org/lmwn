import stylelint from "stylelint";

const ruleName = "custom/enforce-rem-unit";

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (value) =>
    `Unexpected "px" unit in "${value}". Use "rem" instead (only "1px" is allowed).`,
});

const meta = { url: "" };

// Matches a numeric value immediately followed by "px", e.g. "16px", "0.5px", "-2px"
const pxPattern = /(?<!\w)([+-]?(?:\d+\.?\d*|\.\d+))px\b/gi;

/** @type {import('stylelint').Rule} */
const ruleFunction = (primary) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
    });

    if (!validOptions) return;

    root.walkDecls((decl) => {
      pxPattern.lastIndex = 0;

      let match;
      while ((match = pxPattern.exec(decl.value)) !== null) {
        const numericValue = Math.abs(parseFloat(match[1]));

        // Allow exactly 1px (and -1px)
        if (numericValue === 1) continue;

        stylelint.utils.report({
          message: messages.rejected(decl.value),
          node: decl,
          word: match[0],
          result,
          ruleName,
        });
      }
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
