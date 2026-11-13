import stylelint from "stylelint";
import path from "node:path";

const ruleName = "custom/enforce-component-class-pattern";

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (className, componentName) =>
    `Class ".${className}" in "${componentName}" must follow "{ComponentName}__{ElementName}" pattern (PascalCase). Expected ".${componentName}__${className}".`,
});

const meta = { url: "" };

/**
 * Derive the component name from the CSS module file path.
 *
 * - `Button/Button.module.css`     → "Button"
 * - `StepHeader/index.module.css`  → "StepHeader"
 */
function getComponentName(filePath) {
  const basename = path.basename(filePath, ".module.css");
  if (basename === "index") {
    return path.basename(path.dirname(filePath));
  }
  return basename;
}

/**
 * Check whether a string is PascalCase (starts with uppercase, only letters/digits).
 */
function isPascalCase(str) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
}

/** @type {import('stylelint').Rule} */
const ruleFunction = (primary) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
    });

    if (!validOptions) return;

    const filePath = root.source?.input?.file;
    if (!filePath) return;

    // Only apply to *.module.css files
    if (!filePath.endsWith(".module.css")) return;

    // Exclude files under **/styles/** directories
    const normalized = filePath.split(path.sep).join("/");
    if (/\/styles\//.test(normalized)) return;

    const componentName = getComponentName(filePath);

    root.walkRules((rule) => {
      // Skip rules inside :global() — these are intentionally un-scoped
      if (isInsideGlobal(rule)) return;

      const selector = rule.selector;
      // Extract class selectors with a simple regex.
      // Matches ".ClassName" but not inside :global(...) wrappers.
      const withoutGlobal = stripGlobalSelectors(selector);
      const classPattern = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      let match;

      while ((match = classPattern.exec(withoutGlobal)) !== null) {
        const className = match[1];
        const expected = `${componentName}__`;

        // Valid: starts with ComponentName__ and the element part is PascalCase
        if (className.startsWith(expected)) {
          const elementPart = className.slice(expected.length);
          if (isPascalCase(elementPart)) continue;
        }

        stylelint.utils.report({
          message: messages.rejected(className, componentName),
          node: rule,
          word: `.${className}`,
          result,
          ruleName,
        });
      }
    });
  };
};

/**
 * Check if a rule node is nested inside a :global() at-rule or selector.
 */
function isInsideGlobal(node) {
  let parent = node.parent;
  while (parent && parent.type !== "root") {
    if (parent.type === "rule" && /^:global\b/.test(parent.selector)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * Remove :global(...) wrapped selectors from a selector string,
 * so classes inside :global() are not validated.
 */
function stripGlobalSelectors(selector) {
  return selector.replace(/:global\([^)]*\)/g, "");
}

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
