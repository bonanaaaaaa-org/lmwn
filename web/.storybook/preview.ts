import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement } from "react";
import { INITIAL_VIEWPORTS } from "storybook/viewport";

import "modern-normalize/modern-normalize.css";
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
    // Accessibility violations show in the a11y panel; switch to "error" to
    // fail story tests once they are wired up.
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
