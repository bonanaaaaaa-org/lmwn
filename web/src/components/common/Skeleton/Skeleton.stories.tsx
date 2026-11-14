import type { Meta, StoryObj } from "@storybook/react-vite";

import { m } from "@/paraglide/messages.js";

import { Skeleton, SkeletonGroup } from "./Skeleton";

const meta = {
  title: "Components/Common/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = { args: { height: "6rem" } };
export const Image: Story = { args: { aspectRatio: "16 / 9" } };
export const Text: Story = { args: { shape: "text", lines: 3 } };
export const Heading: Story = {
  args: { shape: "block", width: "70%", height: "2rem" },
};
export const Circle: Story = { args: { shape: "circle" } };

/** How building blocks combine into a card-shaped loading state. */
export const CardComposition: Story = {
  render: () => (
    <SkeletonGroup label={m.guide_skeleton_label()}>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <Skeleton aspectRatio="16 / 9" />
        <Skeleton width="80%" height="1.5rem" />
        <Skeleton shape="text" lines={2} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Skeleton width="4rem" height="1.75rem" />
          <Skeleton width="5rem" height="1.75rem" />
        </div>
      </div>
    </SkeletonGroup>
  ),
};
