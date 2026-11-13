import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Storybook builds with this config too; the React Router plugin only applies
// to the app itself (the storybook scripts set STORYBOOK=true).
const isStorybook = process.env.STORYBOOK === "true";

export default defineConfig({
  plugins: [!isStorybook && reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    modules: {
      generateScopedName: "[local]__[hash:base64:5]",
    },
  },
  server: {
    port: 3000,
  },
});
