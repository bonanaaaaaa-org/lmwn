import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement } from "react";
import { INITIAL_VIEWPORTS } from "storybook/viewport";

import "@/styles/globals.css";

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

const preview: Preview = {
  decorators: [withQueryClient],
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
