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
/** Before today's first opening: not open yet. */
export const NotOpenYet: Story = {
  args: { open: false, opensAt: "10:00", notOpenYet: true },
};
/** Between today's hours: closed for a break, opening again later. */
export const ClosedOpensLater: Story = {
  args: { open: false, opensAt: "17:00" },
};
/** Today's hours are over: closed for the day. */
export const ClosedForTheDay: Story = { args: { open: false } };
/** No opening hours today at all: closed today. */
export const ClosedToday: Story = { args: { open: false, closedAllDay: true } };
export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <OpenStatus open />
      <OpenStatus open={false} opensAt="10:00" notOpenYet />
      <OpenStatus open={false} opensAt="17:00" />
      <OpenStatus open={false} />
      <OpenStatus open={false} closedAllDay />
    </div>
  ),
};
