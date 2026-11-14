import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement } from "react";
import { INITIAL_VIEWPORTS } from "storybook/viewport";

import "@/styles/globals.css";

import { LocaleProvider } from "@/lib/Providers";

// Every story gets a QueryClient, so components using TanStack Query render without a
// per-story decorator. Stories seed data via props or `queryClient.setQueryData`, never the network.
const storyQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const withQueryClient: Decorator = (Story) =>
  createElement(
    QueryClientProvider,
    { client: storyQueryClient },
    createElement(Story),
  );

// The toolbar's theme sets `data-theme` on <html>, as a saved choice does in the app (see
// `@/lib/theme`). Story tests run once per theme: vitest.storybook.config.ts defines
// `__STORYBOOK_THEME__` for each run; the Storybook UI starts light.
declare const __STORYBOOK_THEME__: string | undefined;
const initialTheme =
  typeof __STORYBOOK_THEME__ === "string" ? __STORYBOOK_THEME__ : "light";

const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme =
    context.globals.theme === "dark" ? "dark" : "light";
  return createElement(Story);
};

// React Aria formats dates, numbers and collation for the app locale (`th-TH`), as in the app.
const withI18n: Decorator = (Story) =>
  createElement(LocaleProvider, null, createElement(Story));

const preview: Preview = {
  decorators: [withTheme, withI18n, withQueryClient],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: initialTheme },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: INITIAL_VIEWPORTS,
    },
    // Any axe violation, of any impact, fails the story's test (`pnpm test:storybook`,
    // run in CI). Scans use the WCAG 2.2 A and AA tags, the same set as the e2e helper.
    a11y: {
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: [
            "wcag2a",
            "wcag2aa",
            "wcag21a",
            "wcag21aa",
            "wcag22a",
            "wcag22aa",
          ],
        },
      },
    },
  },
};

export default preview;
