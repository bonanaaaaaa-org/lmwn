import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { everyDay } from "@/test-utils/fixtures/guides";
import type { WorkingDay } from "@/features/guides/lib/types";
import { m } from "@/paraglide/messages.js";

import { WorkingHours } from "./WorkingHours";

const DAY = {
  mon: m.restaurantCard_workingHours_monday_label,
  tue: m.restaurantCard_workingHours_tuesday_label,
  wed: m.restaurantCard_workingHours_wednesday_label,
  thu: m.restaurantCard_workingHours_thursday_label,
  fri: m.restaurantCard_workingHours_friday_label,
  sat: m.restaurantCard_workingHours_saturday_label,
  sun: m.restaurantCard_workingHours_sunday_label,
};
const CLOSED = m.restaurantCard_workingHours_closed_body;
const TODAY = (day: string) =>
  m.restaurantCard_workingHours_week_todayLabel({ day });

const BANGKOK = "Asia/Bangkok";
/** 2026-11-19 is a Thursday. */
const thursday = (time: string) => new Date(`2026-11-19T${time}+07:00`);

/** Tuesday to Saturday 09:00–17:00; closed Sunday and Monday. */
const weekdays: WorkingDay[] = [2, 3, 4, 5, 6].map((day) => ({
  day,
  ranges: [{ opensAt: 540, closesAt: 1020 }],
}));

// The component is the group inside the card's details list.
const inList = (ui: ReactNode) => render(<dl>{ui}</dl>);
const root = () => screen.getByTestId("guide/restaurant-card/working-hours");
const toggle = () =>
  screen.getByTestId("guide/restaurant-card/working-hours/toggle");

describe("WorkingHours", () => {
  it("shows today's hours in Thailand time with the Open Now badge", () => {
    inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
        parentTestId="guide/restaurant-card"
      />,
    );
    expect(
      within(root()).getByText(m.restaurantCard_workingHours_title()),
    ).toBeInTheDocument();
    expect(
      within(root()).getByText(m.openStatus_open_label()),
    ).toBeInTheDocument();
    expect(
      within(root()).getByText(
        m.restaurantCard_workingHours_today_body({ hours: "09:00–17:00" }),
      ),
    ).toBeInTheDocument();
  });

  it("says when it opens while closed, and closed today on a closed day", () => {
    const { unmount } = inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={thursday("07:30:00")}
      />,
    );
    expect(
      screen.getByText(m.openStatus_closed_opensAtLabel({ time: "09:00" })),
    ).toBeInTheDocument();
    unmount();

    // Monday is missing from the Working Hours.
    inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={new Date("2026-11-16T12:00:00+07:00")}
      />,
    );
    expect(
      screen.getByText(m.openStatus_closed_todayLabel()),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        m.restaurantCard_workingHours_today_body({ hours: CLOSED() }),
      ),
    ).toBeInTheDocument();
  });

  it("expands the full week with today marked and closed days marked closed", async () => {
    const user = userEvent.setup();
    inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
        parentTestId="guide/restaurant-card"
      />,
    );

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveTextContent(
      m.restaurantCard_workingHours_toggle_closedDaysLabel({
        days: `${DAY.mon()}, ${DAY.sun()}`,
      }),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveTextContent(
      m.restaurantCard_workingHours_toggle_expandedLabel(),
    );
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      `${DAY.mon()}${CLOSED()}`,
      `${DAY.tue()}09:00–17:00`,
      `${DAY.wed()}09:00–17:00`,
      `${TODAY(DAY.thu())}09:00–17:00`,
      `${DAY.fri()}09:00–17:00`,
      `${DAY.sat()}09:00–17:00`,
      `${DAY.sun()}${CLOSED()}`,
    ]);
    expect(rows[3]).toHaveAttribute("aria-current", "date");
    expect(rows.filter((row) => row.hasAttribute("aria-current"))).toHaveLength(
      1,
    );

    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("lists split and overnight ranges as written", async () => {
    const user = userEvent.setup();
    inList(
      <WorkingHours
        workingHours={[
          {
            day: 4,
            ranges: [
              { opensAt: 660, closesAt: 840 },
              { opensAt: 1080, closesAt: 1560 },
            ],
          },
        ]}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
      />,
    );
    expect(
      screen.getByText(
        m.restaurantCard_workingHours_today_body({
          hours: "11:00–14:00, 18:00–02:00",
        }),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(
      screen.getByRole("row", {
        name: `${TODAY(DAY.thu())} 11:00–14:00, 18:00–02:00`,
      }),
    ).toBeInTheDocument();
  });

  it("says until when it is open on yesterday's range past midnight", () => {
    inList(
      <WorkingHours
        workingHours={[{ day: 3, ranges: [{ opensAt: 1080, closesAt: 1560 }] }]}
        timeZone={BANGKOK}
        now={thursday("01:00:00")}
      />,
    );
    expect(screen.getByText(m.openStatus_open_label())).toBeInTheDocument();
    expect(
      screen.getByText(
        m.restaurantCard_workingHours_today_openUntilBody({
          time: "02:00",
          hours: CLOSED(),
        }),
      ),
    ).toBeInTheDocument();
  });

  it("keeps today's own hours beside yesterday's late closing time", () => {
    inList(
      <WorkingHours
        workingHours={[
          { day: 3, ranges: [{ opensAt: 1080, closesAt: 1560 }] },
          { day: 4, ranges: [{ opensAt: 600, closesAt: 840 }] },
        ]}
        timeZone={BANGKOK}
        now={thursday("01:00:00")}
      />,
    );
    expect(
      screen.getByText(
        m.restaurantCard_workingHours_today_openUntilBody({
          time: "02:00",
          hours: "10:00–14:00",
        }),
      ),
    ).toBeInTheDocument();
  });

  it("has no closed-days note when it opens every day", () => {
    inList(
      <WorkingHours
        workingHours={everyDay(480, 1020)}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
      />,
    );
    expect(screen.getByRole("button").textContent).toBe(
      m.restaurantCard_workingHours_toggle_label(),
    );
  });

  it("says closed every day when no day is listed", () => {
    inList(
      <WorkingHours
        workingHours={[]}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent(
      m.restaurantCard_workingHours_toggle_closedEveryDayLabel(),
    );
  });

  describe("on the live clock", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("updates Open Now when the page stays open past opening and closing time", () => {
      vi.setSystemTime(thursday("08:59:00"));
      inList(<WorkingHours workingHours={weekdays} timeZone={BANGKOK} />);
      expect(
        screen.getByText(m.openStatus_closed_opensAtLabel({ time: "09:00" })),
      ).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByText(m.openStatus_open_label())).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(8 * 60 * 60_000);
      });
      expect(
        screen.getByText(m.openStatus_closed_todayLabel()),
      ).toBeInTheDocument();
    });

    it("moves today on at midnight", () => {
      vi.setSystemTime(thursday("23:59:00"));
      inList(<WorkingHours workingHours={weekdays} timeZone={BANGKOK} />);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      // Friday now; still Tuesday–Saturday hours.
      expect(
        screen.getByText(m.openStatus_closed_opensAtLabel({ time: "09:00" })),
      ).toBeInTheDocument();
    });
  });
});
