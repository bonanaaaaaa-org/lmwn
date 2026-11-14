import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { everyDay } from "@/features/guides/lib/fixtures";
import type { WorkingDay } from "@/features/guides/lib/types";

import { WorkingHours } from "./WorkingHours";

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
    expect(within(root()).getByText("เวลาทำการ")).toBeInTheDocument();
    expect(within(root()).getByText("เปิดอยู่")).toBeInTheDocument();
    expect(within(root()).getByText("วันนี้ 09:00–17:00")).toBeInTheDocument();
  });

  it("says when it opens while closed, and closed today on a closed day", () => {
    const { unmount } = inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={thursday("07:30:00")}
      />,
    );
    expect(screen.getByText("ปิดอยู่ · เปิด 09:00")).toBeInTheDocument();
    unmount();

    // Monday is missing from the Working Hours.
    inList(
      <WorkingHours
        workingHours={weekdays}
        timeZone={BANGKOK}
        now={new Date("2026-11-16T12:00:00+07:00")}
      />,
    );
    expect(screen.getByText("ปิดวันนี้")).toBeInTheDocument();
    expect(screen.getByText("วันนี้ ปิด")).toBeInTheDocument();
  });

  it("expands the full week with today marked and closed days reading ปิด", async () => {
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
    expect(toggle()).toHaveTextContent("ดูเวลาทั้งสัปดาห์ · ปิดวันจันทร์, อาทิตย์");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveTextContent("ซ่อนเวลาทั้งสัปดาห์");
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "จันทร์ปิด",
      "อังคาร09:00–17:00",
      "พุธ09:00–17:00",
      "พฤหัสบดี (วันนี้)09:00–17:00",
      "ศุกร์09:00–17:00",
      "เสาร์09:00–17:00",
      "อาทิตย์ปิด",
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
      screen.getByText("วันนี้ 11:00–14:00, 18:00–02:00"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(
      screen.getByRole("row", {
        name: "พฤหัสบดี (วันนี้) 11:00–14:00, 18:00–02:00",
      }),
    ).toBeInTheDocument();
  });

  it("says until when it is open past midnight on a day with no hours of its own", () => {
    inList(
      <WorkingHours
        workingHours={[{ day: 3, ranges: [{ opensAt: 1080, closesAt: 1560 }] }]}
        timeZone={BANGKOK}
        now={thursday("01:00:00")}
      />,
    );
    expect(screen.getByText("เปิดอยู่")).toBeInTheDocument();
    expect(screen.getByText("วันนี้ เปิดถึง 02:00")).toBeInTheDocument();
  });

  it("has no closed-days note when it opens every day", () => {
    inList(
      <WorkingHours
        workingHours={everyDay(480, 1020)}
        timeZone={BANGKOK}
        now={thursday("12:00:00")}
      />,
    );
    expect(screen.getByRole("button").textContent).toBe("ดูเวลาทั้งสัปดาห์");
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
      "ดูเวลาทั้งสัปดาห์ · ปิดทุกวัน",
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
      expect(screen.getByText("ปิดอยู่ · เปิด 09:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByText("เปิดอยู่")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(8 * 60 * 60_000);
      });
      expect(screen.getByText("ปิดวันนี้")).toBeInTheDocument();
    });

    it("moves today on at midnight", () => {
      vi.setSystemTime(thursday("23:59:00"));
      inList(<WorkingHours workingHours={weekdays} timeZone={BANGKOK} />);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      // Friday now; still Tuesday–Saturday hours.
      expect(screen.getByText("ปิดอยู่ · เปิด 09:00")).toBeInTheDocument();
    });
  });
});
