import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { m } from "@/paraglide/messages.js";
import { sampleEmptyState } from "@/test-utils/fixtures/sampleContent";

import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/Common/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    title: sampleEmptyState.searchTitle,
    description: sampleEmptyState.searchDescription,
    actionLabel: sampleEmptyState.clearSearch,
    onAction: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A Guide with no Guide Items yet. */
export const EmptyGuide: Story = {
  args: {
    title: m.guide_emptyState_title(),
    description: m.guide_emptyState_body(),
    actionLabel: m.guide_emptyState_action_label(),
    actionHref: "/",
    onAction: undefined,
  },
};

/** No restaurant matches the filters (the Guide page). */
export const NoFilterMatch: Story = {
  args: {
    icon: false,
    meta: sampleEmptyState.filterMeta,
    title: sampleEmptyState.filterTitle,
    description: undefined,
    actionLabel: sampleEmptyState.clearFilters,
    actionVariant: "primary",
  },
};

export const WithoutAction: Story = { args: { actionLabel: undefined } };
