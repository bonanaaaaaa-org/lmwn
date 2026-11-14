import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";

const meta = {
  title: "Components/Common/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "Official", variant: "official" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Official: Story = {};
export const Neutral: Story = {
  args: { variant: "neutral", children: "เดลิเวอรี่" },
};
export const Row: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Badge variant="official">Official</Badge>
      <Badge>เดลิเวอรี่</Badge>
      <Badge>รับเองที่ร้าน</Badge>
    </div>
  ),
};
