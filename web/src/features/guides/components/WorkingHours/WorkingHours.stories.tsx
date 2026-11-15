import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { everyDay } from "@/test-utils/fixtures/guides";
import type { WorkingDay } from "@/features/guides/lib/types";

import { WorkingHours } from "./WorkingHours";

/** Thursday 19 November 2026 in Bangkok. */
const thursday = (time: string) =>
  Temporal.Instant.from(`2026-11-19T${time}+07:00`);

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
/**
 * The full week. Every day's name and hours line up with today's, whose grey band once
 * added padding the other days didn't have.
 */
export const Expanded: Story = {
  args: { defaultExpanded: true },
  play: async ({ canvasElement }) => {
    const rows = [...canvasElement.querySelectorAll("tr")].filter(
      (row) => row.cells.length === 2,
    );
    await expect(rows).toHaveLength(7);
    const today = rows.find(
      (row) => row.getAttribute("aria-current") === "date",
    );
    if (!today) throw new Error("no row is marked as today");
    // Where each cell's text starts and ends, inside its padding.
    const textEdges = (cell: HTMLTableCellElement) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      const { left, right } = range.getBoundingClientRect();
      return { left: Math.round(left), right: Math.round(right) };
    };
    const [todayDay, todayHours] = [...today.cells].map(textEdges);
    for (const row of rows) {
      const [day, hours] = [...row.cells].map(textEdges);
      await expect(day?.left).toBe(todayDay?.left);
      await expect(hours?.right).toBe(todayHours?.right);
    }
  },
};
export const ClosedOpensLater: Story = {
  args: { workingHours: tuesdayToSaturday, now: thursday("07:30:00") },
};
/** Thursday 20:00, after 09:00–17:00: closed for the day. */
export const ClosedForTheDay: Story = {
  args: { workingHours: tuesdayToSaturday, now: thursday("20:00:00") },
};
/** Monday, with no hours at all: closed today. */
export const ClosedToday: Story = {
  args: {
    workingHours: tuesdayToSaturday,
    now: Temporal.Instant.from("2026-11-16T12:00:00+07:00"),
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
