import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Storybook builds with this config too; the React Router plugin only applies
// to the app itself (the storybook scripts set STORYBOOK=true).
const isStorybook = process.env.STORYBOOK === "true";

/** The manifest's copy comes from the Thai catalog, like every other user-facing string. */
const catalog = JSON.parse(
  readFileSync(new URL("messages/th.json", import.meta.url), "utf8"),
) as Record<string, string>;
const message = (key: string): string => {
  const value = catalog[key];
  if (!value) throw new Error(`messages/th.json has no "${key}"`);
  return value;
};

/** React Router's client build directory (Firebase Hosting's `public`). */
const CLIENT_OUT_DIR = "build/client";

/**
 * The precache revision of `index.html`. React Router writes the SPA's `index.html` after Vite's
 * bundle hooks, where the service worker's precache list is built, so the file can't be hashed
 * there. Every byte of it is rendered by the root route module and points at the hashed assets,
 * so any change to it changes some asset's file name: hashing the names stands in for hashing it.
 */
function indexHtmlRevision(): string {
  const assets = readdirSync(
    fileURLToPath(new URL(`${CLIENT_OUT_DIR}/assets`, import.meta.url)),
  ).sort();
  return createHash("sha256")
    .update(assets.join("\n"))
    .digest("hex")
    .slice(0, 16);
}

/** Design tokens (src/styles/globals.css): saffron accent and ink text. */
const SAFFRON = "#f2b705";
const INK = "#111111";

export default defineConfig({
  plugins: [
    // Compiles web/messages/th.json into typed message functions in src/paraglide (gitignored).
    // Options live in project.inlang/paraglide.config.ts, shared with `pnpm gen:i18n`.
    paraglideVitePlugin({ project: "./project.inlang" }),
    !isStorybook && reactRouter(),
    // The installable PWA (#43): the web app manifest and the service worker (src/sw.ts), in
    // production builds only. `pnpm dev`, Storybook and Vitest never register a worker.
    VitePWA({
      disable: isStorybook,
      strategies: "injectManifest",
      srcDir: "src",
      outDir: CLIENT_OUT_DIR,
      filename: "sw.ts",
      // The page registers the worker itself (src/lib/serviceWorker.ts), after load, and asks
      // before a new version takes over (the update toast).
      injectRegister: false,
      registerType: "prompt",
      manifestFilename: "manifest.webmanifest",
      manifest: {
        id: "/",
        name: message("app_manifest_title"),
        short_name: message("app_manifest_shortTitle"),
        description: message("app_description"),
        lang: "th",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: SAFFRON,
        background_color: INK,
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        // The app shell: hashed JS, CSS and the Mali woff2 files (every browser with service
        // workers reads woff2, so the .woff fallbacks stay out), the SPA page and the icons.
        globPatterns: [
          "assets/**/*.{js,css,woff2}",
          "favicon.svg",
          "icons/*.png",
        ],
      },
      integration: {
        // index.html doesn't exist yet when the worker is built (see indexHtmlRevision).
        beforeBuildServiceWorker(options) {
          options.injectManifest.additionalManifestEntries = [
            { url: "index.html", revision: indexHtmlRevision() },
          ];
        },
      },
      devOptions: { enabled: false },
    }),
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
  build: {
    // The app gets one stylesheet (~9 KB gzipped) instead of one per chunk: fewer
    // render-blocking requests on the critical path (Lighthouse, #16). Its first rule may come
    // from a component, so app/root.tsx declares the layer order before it. Storybook keeps
    // the default split.
    cssCodeSplit: isStorybook,
  },
  server: {
    port: 3000,
  },
});
