import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Stylelint configuration:
 * - z-index and !important are forbidden
 * - units must be rem (1px allowed for borders)
 * - CSS Module classes follow {ComponentName}__{ElementName} (PascalCase)
 * - colours come from tokens: colour literals only in src/styles/globals.css, so every colour
 *   has a light and a dark value (dark mode, #47)
 * - CSS features must be supported by every browser in the package.json browserslist (#62)
 * - each folder's CSS Modules sit in its own cascade layer: components/common in `components`,
 *   components/layout in `layout`, features/<feature>/pages in `pages`, the rest of features in
 *   `features` (#69)
 * - a className a parent passes to a child component sets only the child's outside (#69)
 */
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  plugins: [
    "stylelint-no-unsupported-browser-features",
    path.join(dir, "stylelint-plugins/enforce-rem-unit.mjs"),
    path.join(dir, "stylelint-plugins/enforce-component-class-pattern.mjs"),
    path.join(dir, "stylelint-plugins/enforce-css-layer.mjs"),
    path.join(dir, "stylelint-plugins/enforce-outside-only-classname.mjs"),
  ],
  ignoreFiles: ["build/**", "node_modules/**", "public/**", "coverage/**"],
  rules: {
    // Checked against the package.json browserslist. Only features a target lacks entirely are
    // reported (`ignorePartialSupport`): caniuse's partial-support notes (clip-path shapes,
    // multi-column details, ...) don't match how the stylesheets use these properties, and every
    // target is Safari 18+ or an evergreen browser. The features allowed anyway, each with a reason:
    // - css3-cursors, css3-cursors-newer: iOS has no mouse pointer; the cursor is a desktop hint.
    // - css-scrollbar: `scrollbar-width: none` only hides scrollbars on rails that scroll anyway;
    //   iOS Safari draws overlay scrollbars, which is harmless.
    // - css-touch-action: only desktop Safari lacks it, and it has no touch input; iOS Safari and
    //   the other targets need it for the Lightbox swipe.
    // No stylelint-disable comments for this rule: allow a feature here, with its reason.
    "plugin/no-unsupported-browser-features": [
      true,
      {
        severity: "error",
        ignorePartialSupport: true,
        ignore: [
          "css3-cursors",
          "css3-cursors-newer",
          "css-scrollbar",
          "css-touch-action",
        ],
      },
    ],
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
    // Keep in step with CSS_LAYER_ORDER (src/styles/layers.ts): each folder can restyle the ones
    // listed before it through `className`. The first matching folder wins (`*` is one segment).
    "custom/enforce-css-layer": {
      "components/common": "components",
      "components/layout": "layout",
      "features/*/pages": "pages",
      features: "features",
    },
    // A className passed to one of the project's components sets only its outside (#69).
    "custom/enforce-outside-only-classname": [true, { reportDisables: true }],
    "at-rule-no-unknown": [true, { ignoreAtRules: ["value"] }],
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": [
      "rgb",
      "rgba",
      "hsl",
      "hsla",
      "hwb",
      "lab",
      "lch",
      "oklab",
      "oklch",
      "color",
      "light-dark",
    ],
  },
  overrides: [
    {
      // The design tokens: the one place colour values are written.
      files: ["src/styles/globals.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "function-disallowed-list": null,
      },
    },
    {
      // app/ holds framework-owned files (lowercase root.tsx), so the
      // PascalCase component naming convention can't apply there.
      files: ["app/**/*.css"],
      rules: { "custom/enforce-component-class-pattern": null },
    },
  ],
};
