import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  css: {
    modules: {
      generateScopedName: "[local]__[hash:base64:5]",
    },
  },
  server: {
    port: 3000,
  },
});
