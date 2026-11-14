import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

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

/**
 * A circle beside taller content in a flex row, as in the Guide page's card header. It
 * stays a circle: a flex row's default `align-items: stretch` once stretched it into an oval.
 */
export const CircleInFlexRow: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Skeleton shape="circle" width="2rem" />
      <div style={{ display: "grid", flex: 1, gap: "0.75rem" }}>
        <Skeleton width="55%" height="1.75rem" />
        <Skeleton width="35%" height="1rem" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const circle = canvasElement.querySelector('[data-shape="circle"]');
    if (!circle) throw new Error("no circle skeleton rendered");
    const { width, height } = circle.getBoundingClientRect();
    await expect(width).toBeGreaterThan(0);
    await expect(height).toBeCloseTo(width, 0);
  },
};

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
