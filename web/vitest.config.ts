import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the React Router plugin is for the dev server
// and build only — tests render components directly with plugin-react. Paraglide compiles the
// message catalog here too, so `pnpm test` works on a clean checkout.
export default defineConfig({
  plugins: [paraglideVitePlugin({ project: "./project.inlang" }), react()],
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    modules: {
      generateScopedName: "[local]",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    include: ["{app,src}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test-utils/**",
      ],
    },
  },
});
