import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Storybook builds with this config too; the React Router plugin only applies
// to the app itself (the storybook scripts set STORYBOOK=true).
const isStorybook = process.env.STORYBOOK === "true";

export default defineConfig({
  plugins: [
    // Compiles web/messages/th.json into typed message functions in src/paraglide (gitignored).
    // Options live in project.inlang/paraglide.config.ts, shared with `pnpm gen:i18n`.
    paraglideVitePlugin({ project: "./project.inlang" }),
    !isStorybook && reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    modules: {
      generateScopedName: "[local]__[hash:base64:5]",
    },
  },
  // React Router's SPA entry statically imports only react/react-dom/react-router, so
  // Vite discovers other deps at runtime and re-optimizes mid-session — which can serve
  // two copies of React ("Invalid hook call"). Pre-bundle them in the first round.
  optimizeDeps: {
    include: [
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
      "react-aria",
      "react-aria-components",
      "zod",
      "clsx",
    ],
  },
  server: {
    port: 3000,
  },
});
