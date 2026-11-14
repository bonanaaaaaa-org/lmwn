import type { Meta, StoryObj } from "@storybook/react-vite";

import { OpenStatus } from "./OpenStatus";

const meta = {
  title: "Components/Common/OpenStatus",
  component: OpenStatus,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { open: true },
} satisfies Meta<typeof OpenStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const ClosedOpensLater: Story = {
  args: { open: false, opensAt: "10:00" },
};
export const ClosedToday: Story = { args: { open: false } };
export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <OpenStatus open />
      <OpenStatus open={false} opensAt="10:00" />
      <OpenStatus open={false} />
    </div>
  ),
};
