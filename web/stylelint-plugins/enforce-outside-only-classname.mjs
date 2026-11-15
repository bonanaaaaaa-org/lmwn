import { existsSync, statSync } from "node:fs";
import path from "node:path";

import stylelint from "stylelint";
import { SyntaxKind } from "typescript/unstable/ast";
import { API } from "typescript/unstable/sync";

const ruleName = "custom/enforce-outside-only-classname";

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (property, className, component) =>
    `".${className}" is passed to <${component}> as className, so it may set only the child's outside ` +
    `(margin, self-alignment, order, position, grid or flex placement, size constraints), not "${property}". ` +
    `Make it a prop or variant on ${component}.`,
});

const meta = { url: "" };

/**
 * What a parent may set on a child component through `className`: the child's outside (#69).
 * Colours, padding, typography, borders and the rest are the child's inside: a prop or variant.
 */
const OUTSIDE_PROPERTIES = new Set([
  "align-self",
  "justify-self",
  "place-self",
  "order",
  // Positioning the child in the parent: placement, like grid or flex placement.
  "position",
  "inset",
  "inset-block",
  "inset-block-start",
  "inset-block-end",
  "inset-inline",
  "inset-inline-start",
  "inset-inline-end",
  "top",
  "right",
  "bottom",
  "left",
  // Grid placement.
  "grid-area",
  "grid-column",
  "grid-column-start",
  "grid-column-end",
  "grid-row",
  "grid-row-start",
  "grid-row-end",
  // Flex placement.
  "flex",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  // Width and size constraints.
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "inline-size",
  "min-inline-size",
  "max-inline-size",
  "block-size",
  "min-block-size",
  "max-block-size",
  "aspect-ratio",
]);

const isOutsideProperty = (property) =>
  OUTSIDE_PROPERTIES.has(property) || /^margin(-|$)/.test(property);

// --- Reading the component (TypeScript 7's compiler API) ---------------------------------------

/** One tsgo process per lint run, closed when Node exits. */
let api;
/** tsconfig path → its latest snapshot */
const snapshots = new Map();
/** .tsx path → mtime when last read, to refresh the snapshot only when the file changed */
const readAt = new Map();

function getApi() {
  if (!api) {
    api = new API({ cwd: process.cwd() });
    // Close tsgo once the event loop drains (Stylelint's CLI ends that way), so it shuts down
    // cleanly; `exit` is the fallback for a process.exit() that skips beforeExit.
    const close = () => {
      try {
        api?.close();
      } catch {
        // tsgo is already gone; nothing is left to clean up.
      }
      api = undefined;
      snapshots.clear();
      readAt.clear();
    };
    process.once("beforeExit", close);
    process.once("exit", close);
  }
  return api;
}

function nearestTsconfig(file) {
  let dir = path.dirname(file);
  for (;;) {
    const candidate = path.join(dir, "tsconfig.json");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function getSourceFile(tsxPath) {
  const tsconfig = nearestTsconfig(tsxPath);
  if (!tsconfig) return undefined;
  const mtime = statSync(tsxPath).mtimeMs;
  let snapshot = snapshots.get(tsconfig);
  if (!snapshot) {
    snapshot = getApi().updateSnapshot({ openProjects: [tsconfig] });
  } else if (readAt.has(tsxPath) && readAt.get(tsxPath) !== mtime) {
    // A long-lived Stylelint (an editor) sees the component as it is now, not as first read.
    snapshot = getApi().updateSnapshot({
      openProjects: [tsconfig],
      fileChanges: { changed: [tsxPath] },
    });
  }
  snapshots.set(tsconfig, snapshot);
  readAt.set(tsxPath, mtime);
  return snapshot.getProject(tsconfig)?.program.getSourceFile(tsxPath);
}

/** A module the project owns: an alias (`@/…`) or a relative path, not a package. */
const isProjectModule = (specifier) =>
  specifier.startsWith("@/") || specifier.startsWith(".");

/**
 * Maps each class the component passes as `className` to one of the project's own components
 * (an element imported from `@/…` or `./…`) to that component's name. Third-party primitives
 * (React Aria's `Button`, `Input`, ...) render this component's own DOM and are not children.
 */
export function findChildClasses(sourceFile, cssBasename) {
  const projectImports = new Set();
  let stylesName;

  const collectImports = (node) => {
    if (node.kind !== SyntaxKind.ImportDeclaration || !node.importClause)
      return;
    const specifier = node.moduleSpecifier.text;
    if (specifier === `./${cssBasename}`) {
      stylesName = node.importClause.name?.text;
      return;
    }
    if (!isProjectModule(specifier)) return;
    if (node.importClause.name) projectImports.add(node.importClause.name.text);
    for (const element of node.importClause.namedBindings?.elements ?? []) {
      projectImports.add(element.name.text);
    }
  };
  sourceFile.forEachChild(collectImports);

  const childClasses = new Map();
  if (!stylesName) return childClasses;

  const visit = (node) => {
    if (
      node.kind === SyntaxKind.JsxAttribute &&
      node.name.text === "className"
    ) {
      const tag = node.parent.parent.tagName;
      const root =
        tag.kind === SyntaxKind.Identifier ? tag.text : tag.expression?.text;
      const name =
        tag.kind === SyntaxKind.Identifier
          ? tag.text
          : `${root}.${tag.name?.text}`;
      if (root && /^[A-Z]/.test(root) && projectImports.has(root)) {
        // Every `styles.X` in the value: `styles.X`, `clsx(styles.X, cond && styles.Y)`, ...
        const collect = (inner) => {
          if (
            inner.kind === SyntaxKind.PropertyAccessExpression &&
            inner.expression.kind === SyntaxKind.Identifier &&
            inner.expression.text === stylesName
          ) {
            childClasses.set(inner.name.text, name);
          }
          inner.forEachChild(collect);
        };
        collect(node);
      }
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return childClasses;
}

// --- Matching rules to classes ----------------------------------------------------------------

/** Splits on `separator` outside brackets, parentheses and strings. */
function splitTopLevel(selector, isSeparator) {
  const parts = [];
  let depth = 0;
  let quote;
  let current = "";
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(" || char === "[") {
      depth++;
    } else if (char === ")" || char === "]") {
      depth--;
    } else if (depth === 0 && isSeparator(char)) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The rule's selectors with CSS nesting (`&`, implicit descendant) resolved. */
function resolveSelectors(rule) {
  let parent = rule.parent;
  while (parent && parent.type !== "rule" && parent.type !== "root")
    parent = parent.parent;
  const own = splitTopLevel(rule.selector, (char) => char === ",");
  if (!parent || parent.type !== "rule") return own;
  const outer = resolveSelectors(parent);
  return own.flatMap((selector) =>
    outer.map((parentSelector) =>
      selector.includes("&")
        ? selector.replaceAll("&", `:is(${parentSelector})`)
        : `${parentSelector} ${selector}`,
    ),
  );
}

/** Classes on the element a selector styles: its last compound, outside :not()/:has(). */
function subjectClasses(selector) {
  const compounds = splitTopLevel(selector, (char) => /[\s>+~]/.test(char));
  let subject = compounds.at(-1) ?? "";
  subject = subject.replace(/:(not|has)\((?:[^()]|\([^()]*\))*\)/g, "");
  return [...subject.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]);
}

/** @type {import('stylelint').Rule} */
const ruleFunction = (primary) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true],
    });
    if (!validOptions) return;

    const cssPath = root.source?.input?.file;
    if (!cssPath?.endsWith(".module.css")) return;
    const tsxPath = cssPath.replace(/\.module\.css$/, ".tsx");
    if (!existsSync(tsxPath)) return;

    const sourceFile = getSourceFile(tsxPath);
    if (!sourceFile) return;
    const childClasses = findChildClasses(sourceFile, path.basename(cssPath));
    if (childClasses.size === 0) return;

    // A declaration belongs to its nearest rule, through any at-rules (`@media`) in between.
    const targetedChild = new Map();
    root.walkDecls((decl) => {
      if (isOutsideProperty(decl.prop.toLowerCase())) return;
      let rule = decl.parent;
      while (rule && rule.type === "atrule") rule = rule.parent;
      if (!rule || rule.type !== "rule") return;
      if (!targetedChild.has(rule)) {
        const targeted = resolveSelectors(rule).flatMap(subjectClasses);
        targetedChild.set(
          rule,
          targeted.find((name) => childClasses.has(name)),
        );
      }
      const className = targetedChild.get(rule);
      if (!className) return;
      stylelint.utils.report({
        message: messages.rejected(
          decl.prop,
          className,
          childClasses.get(className),
        ),
        node: decl,
        word: decl.prop,
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
