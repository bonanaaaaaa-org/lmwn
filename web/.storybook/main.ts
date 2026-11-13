import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Reuses vite.config.ts (path alias, CSS Modules naming); the React Router
  // plugin is skipped there when STORYBOOK=true, which the scripts set.
  viteFinal: async (config) => ({
    ...config,
    define: {
      ...config.define,
      // Stories never call the gateway; this keeps @/lib/env deterministic.
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        "http://localhost:4000",
      ),
    },
  }),
};

export default config;
