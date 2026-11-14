import type { Meta, StoryObj } from "@storybook/react-vite";

import { m } from "@/paraglide/messages.js";

import { Badge } from "./Badge";

const meta = {
  title: "Components/Common/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    children: m.restaurantCard_badges_official_label(),
    variant: "official",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Official: Story = {};
export const Neutral: Story = {
  args: {
    variant: "neutral",
    children: m.restaurantCard_badges_delivery_label(),
  },
};
export const Row: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Badge variant="official">
        {m.restaurantCard_badges_official_label()}
      </Badge>
      <Badge>{m.restaurantCard_badges_delivery_label()}</Badge>
      <Badge>{m.restaurantCard_badges_pickup_label()}</Badge>
    </div>
  ),
};
