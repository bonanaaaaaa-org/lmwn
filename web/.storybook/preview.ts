import type { Preview } from "@storybook/react-vite";
import { INITIAL_VIEWPORTS } from "storybook/viewport";

import "modern-normalize/modern-normalize.css";
import "@/styles/globals.css";

const preview: Preview = {
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
