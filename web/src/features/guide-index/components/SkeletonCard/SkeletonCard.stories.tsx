import type { Meta, StoryObj } from "@storybook/react-vite";

import { SkeletonGroup } from "@/components/common/Skeleton";
import { m } from "@/paraglide/messages.js";

import { SkeletonCard } from "./SkeletonCard";

const meta = {
  title: "Features/GuideIndex/SkeletonCard",
  component: SkeletonCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "23.75rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SkeletonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const Phone: Story = { args: { layout: "phone" } };

/** As the Guide Index shows them on first load: one "loading" announcement for the set. */
export const Group: Story = {
  decorators: [
    (Story) => (
      <SkeletonGroup label={m.guideIndex_skeleton_label()}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <Story />
          <Story />
        </div>
      </SkeletonGroup>
    ),
  ],
};
