import type { Meta, StoryObj } from "@storybook/react-vite";

import { GuidePageSkeleton } from "./GuidePageSkeleton";

const meta = {
  title: "Features/Guides/GuidePageSkeleton",
  component: GuidePageSkeleton,
  tags: ["autodocs"],
  args: { layout: "desktop", parentTestId: "guide" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "70rem", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GuidePageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
export const Phone: Story = {
  args: { layout: "phone" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
