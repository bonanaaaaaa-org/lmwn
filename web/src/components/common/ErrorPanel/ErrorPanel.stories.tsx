import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  sampleOverrides,
  stressCopy,
} from "@/test-utils/fixtures/sampleContent";

import { ErrorPanel } from "./ErrorPanel";

const meta = {
  title: "Components/Common/ErrorPanel",
  component: ErrorPanel,
  tags: ["autodocs"],
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Offline, and the page was never opened before, so the service worker has nothing saved. */
export const Offline: Story = { args: { isOffline: true } };
export const Retrying: Story = { args: { isRetrying: true } };
export const Inline: Story = {
  args: {
    variant: "inline",
    title: sampleOverrides.searchErrorTitle,
    description: sampleOverrides.searchErrorDescription,
  },
};
export const WithoutRetry: Story = { args: { onRetry: undefined } };
export const LongContent: Story = {
  args: {
    title: stressCopy.errorTitle,
    description: stressCopy.errorDescription,
  },
};
