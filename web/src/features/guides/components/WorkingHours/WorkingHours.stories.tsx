import type { Meta, StoryObj } from "@storybook/react-vite";

import { everyDay } from "@/features/guides/lib/fixtures";
import type { WorkingDay } from "@/features/guides/lib/types";

import { WorkingHours } from "./WorkingHours";

/** Thursday 19 November 2026 in Bangkok. */
const thursday = (time: string) => new Date(`2026-11-19T${time}+07:00`);

/** Tuesday to Saturday 09:00–17:00; closed Sunday and Monday. */
const tuesdayToSaturday: WorkingDay[] = [2, 3, 4, 5, 6].map((day) => ({
  day,
  ranges: [{ opensAt: 540, closesAt: 1020 }],
}));

const meta = {
  title: "Features/Guides/WorkingHours",
  component: WorkingHours,
  tags: ["autodocs"],
  args: {
    workingHours: everyDay(480, 1020),
    timeZone: "Asia/Bangkok",
    now: thursday("12:00:00"),
    parentTestId: "guide/restaurant-card",
  },
  // It is a group of the card's details list.
  decorators: [
    (Story) => (
      <dl style={{ maxWidth: "22rem", margin: 0, padding: "1rem" }}>
        <Story />
      </dl>
    ),
  ],
} satisfies Meta<typeof WorkingHours>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Expanded: Story = { args: { defaultExpanded: true } };
export const ClosedOpensLater: Story = {
  args: { workingHours: tuesdayToSaturday, now: thursday("07:30:00") },
};
export const ClosedToday: Story = {
  args: {
    workingHours: tuesdayToSaturday,
    now: new Date("2026-11-16T12:00:00+07:00"),
  },
};
export const ClosedDaysExpanded: Story = {
  args: { workingHours: tuesdayToSaturday, defaultExpanded: true },
};
export const OvernightAndSplit: Story = {
  args: {
    workingHours: [
      {
        day: 4,
        ranges: [
          { opensAt: 660, closesAt: 840 },
          { opensAt: 1080, closesAt: 1560 },
        ],
      },
      { day: 5, ranges: [{ opensAt: 0, closesAt: 1440 }] },
    ],
    defaultExpanded: true,
  },
};
export const OpenPastMidnight: Story = {
  args: {
    workingHours: [{ day: 3, ranges: [{ opensAt: 1080, closesAt: 1560 }] }],
    now: thursday("01:00:00"),
  },
};
