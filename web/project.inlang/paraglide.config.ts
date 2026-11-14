import { defineConfig } from "@inlang/paraglide-js";

// Shared by the Vite plugin (vite.config.ts, vitest.config.ts) and the CLI (`pnpm gen:i18n`),
// so every entry point compiles the same output.
export default defineConfig({
  outdir: "./src/paraglide",
  // Thai is the base and only locale: no cookie, URL or browser detection.
  strategy: ["baseLocale"],
  emitTsDeclarations: true,
});
