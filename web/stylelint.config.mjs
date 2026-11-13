import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Stylelint configuration:
 * - z-index and !important are forbidden
 * - units must be rem (1px allowed for borders)
 * - CSS Module classes follow {ComponentName}__{ElementName} (PascalCase)
 */
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  plugins: [
    path.join(dir, "stylelint-plugins/enforce-rem-unit.mjs"),
    path.join(dir, "stylelint-plugins/enforce-component-class-pattern.mjs"),
  ],
  ignoreFiles: ["build/**", "node_modules/**", "public/**", "coverage/**"],
  rules: {
    "declaration-property-value-disallowed-list": [
      { "z-index": ["/./"] },
      { reportDisables: true },
    ],
    "property-disallowed-list": [["z-index"], { reportDisables: true }],
    "declaration-no-important": [true, { reportDisables: true }],
    "keyframe-declaration-no-important": [true, { reportDisables: true }],
    "custom/enforce-rem-unit": true,
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global"] },
    ],
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
    "selector-class-pattern": null,
    "custom/enforce-component-class-pattern": true,
    "at-rule-no-unknown": [true, { ignoreAtRules: ["value"] }],
  },
  overrides: [
    {
      // app/ holds framework-owned files (lowercase root.tsx), so the
      // PascalCase component naming convention can't apply there.
      files: ["app/**/*.css"],
      rules: { "custom/enforce-component-class-pattern": null },
    },
  ],
};
