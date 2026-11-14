import { afterAll, describe, expect, it } from "vitest";

import { m } from "@/paraglide/messages.js";

import { everyDay } from "@/test-utils/fixtures/guides";
import {
  formatOpeningRange,
  formatOpeningTime,
  isOpenNow,
  openStatus,
  weekdayAndMinutes,
} from "./openNow";
import type { WorkingDay } from "./types";

const BANGKOK = "Asia/Bangkok";

/** 2026-11-16 is a Monday. Bangkok is UTC+7 all year. */
const bangkok = (isoLocal: string) => new Date(`${isoLocal}+07:00`);

/** Monday 18:00–02:00 only; every other day closed. */
const mondayLateNight: WorkingDay[] = [
  { day: 1, ranges: [{ opensAt: 1080, closesAt: 1560 }] },
  ...[2, 3, 4, 5, 6, 7].map((day) => ({ day, ranges: [] })),
];

const originalTz = process.env.TZ;
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(["Asia/Bangkok", "UTC", "America/Los_Angeles"])(
  "Open Now with the viewer's clock in %s",
  (viewerTimeZone) => {
    it("runs with that viewer time zone", () => {
      process.env.TZ = viewerTimeZone;
      const offset = new Date("2026-11-16T12:00:00Z").getTimezoneOffset();
      const expected = {
        "Asia/Bangkok": -420,
        UTC: 0,
        "America/Los_Angeles": 480,
      };
      expect(offset).toBe(expected[viewerTimeZone as keyof typeof expected]);
    });

    it("reads the weekday and minutes in the gateway's time zone", () => {
      process.env.TZ = viewerTimeZone;
      // Monday 23:30 UTC is already Tuesday 06:30 in Bangkok.
      expect(
        weekdayAndMinutes(new Date("2026-11-16T23:30:00Z"), BANGKOK),
      ).toEqual({ day: 2, minutes: 390 });
      // Sunday wraps to ISO weekday 7, midnight to 0 minutes.
      expect(
        weekdayAndMinutes(bangkok("2026-11-22T00:00:00"), BANGKOK),
      ).toEqual({ day: 7, minutes: 0 });
    });

    it("counts Monday 18:00–02:00 as open at 01:00 on Tuesday", () => {
      process.env.TZ = viewerTimeZone;
      expect(
        isOpenNow(mondayLateNight, bangkok("2026-11-17T01:00:00"), BANGKOK),
      ).toBe(true);
    });

    it("closes an overnight range at its closing minute", () => {
      process.env.TZ = viewerTimeZone;
      expect(
        isOpenNow(mondayLateNight, bangkok("2026-11-17T01:59:00"), BANGKOK),
      ).toBe(true);
      expect(
        isOpenNow(mondayLateNight, bangkok("2026-11-17T02:00:00"), BANGKOK),
      ).toBe(false);
    });

    it("opens a range at its opening minute and closes it at its closing minute", () => {
      process.env.TZ = viewerTimeZone;
      const hours = everyDay(480, 1020);
      expect(isOpenNow(hours, bangkok("2026-11-18T07:59:00"), BANGKOK)).toBe(
        false,
      );
      expect(isOpenNow(hours, bangkok("2026-11-18T08:00:00"), BANGKOK)).toBe(
        true,
      );
      expect(isOpenNow(hours, bangkok("2026-11-18T16:59:00"), BANGKOK)).toBe(
        true,
      );
      expect(isOpenNow(hours, bangkok("2026-11-18T17:00:00"), BANGKOK)).toBe(
        false,
      );
    });

    it("treats a missing day as closed all day", () => {
      process.env.TZ = viewerTimeZone;
      const weekdaysOnly: WorkingDay[] = [1, 2, 3, 4, 5].map((day) => ({
        day,
        ranges: [{ opensAt: 0, closesAt: 1440 }],
      }));
      // Saturday noon: Saturday isn't listed at all.
      expect(
        isOpenNow(weekdaysOnly, bangkok("2026-11-21T12:00:00"), BANGKOK),
      ).toBe(false);
      // Tuesday, an empty day, at 01:00 after Monday's 18:00–02:00.
      expect(
        isOpenNow(mondayLateNight, bangkok("2026-11-18T01:00:00"), BANGKOK),
      ).toBe(false);
    });
  },
);

describe("isOpenNow", () => {
  it("checks every range of a split day", () => {
    const split: WorkingDay[] = [
      {
        day: 3,
        ranges: [
          { opensAt: 660, closesAt: 840 },
          { opensAt: 1020, closesAt: 1320 },
        ],
      },
    ];
    expect(isOpenNow(split, bangkok("2026-11-18T12:00:00"), BANGKOK)).toBe(
      true,
    );
    expect(isOpenNow(split, bangkok("2026-11-18T15:00:00"), BANGKOK)).toBe(
      false,
    );
    expect(isOpenNow(split, bangkok("2026-11-18T18:00:00"), BANGKOK)).toBe(
      true,
    );
  });

  it("carries Sunday's overnight range into Monday", () => {
    const sunday: WorkingDay[] = [
      { day: 7, ranges: [{ opensAt: 1200, closesAt: 1500 }] },
    ];
    expect(isOpenNow(sunday, bangkok("2026-11-16T00:30:00"), BANGKOK)).toBe(
      true,
    );
  });

  it("is open all day for 00:00–24:00", () => {
    const allDay = everyDay(0, 1440);
    expect(isOpenNow(allDay, bangkok("2026-11-18T00:00:00"), BANGKOK)).toBe(
      true,
    );
    expect(isOpenNow(allDay, bangkok("2026-11-18T23:59:00"), BANGKOK)).toBe(
      true,
    );
  });

  it("is closed with no Working Hours at all", () => {
    expect(isOpenNow([], bangkok("2026-11-18T12:00:00"), BANGKOK)).toBe(false);
  });
});

describe("openStatus", () => {
  it("gives the closing time while open", () => {
    expect(
      openStatus(everyDay(480, 1020), bangkok("2026-11-18T09:00:00"), BANGKOK),
    ).toEqual({ open: true, closesAt: 1020 });
  });

  it("gives the closing time of yesterday's range that runs past midnight", () => {
    expect(
      openStatus(mondayLateNight, bangkok("2026-11-17T01:00:00"), BANGKOK),
    ).toEqual({ open: true, closesAt: 120, fromYesterday: true });
  });

  it("gives today's next opening time while closed before it", () => {
    const split: WorkingDay[] = [
      {
        day: 3,
        ranges: [
          { opensAt: 1020, closesAt: 1320 },
          { opensAt: 660, closesAt: 840 },
        ],
      },
    ];
    // Before today's first opening: not open yet.
    expect(openStatus(split, bangkok("2026-11-18T08:00:00"), BANGKOK)).toEqual({
      open: false,
      opensAt: 660,
      notOpenYet: true,
    });
    // Between the two ranges: closed for a break, opening again later.
    expect(openStatus(split, bangkok("2026-11-18T15:00:00"), BANGKOK)).toEqual({
      open: false,
      opensAt: 1020,
    });
  });

  it("is not open yet after yesterday's overnight range ends, before today's opening", () => {
    // Monday 18:00–02:00; Monday 03:00 follows Sunday's (none) and precedes Monday's 18:00.
    expect(
      openStatus(mondayLateNight, bangkok("2026-11-16T03:00:00"), BANGKOK),
    ).toEqual({ open: false, opensAt: 1080, notOpenYet: true });
  });

  it("is closed for the day once today's ranges are over", () => {
    expect(
      openStatus(everyDay(480, 1020), bangkok("2026-11-18T20:00:00"), BANGKOK),
    ).toEqual({ open: false });
  });

  it("is closed all day on a day without ranges", () => {
    expect(
      openStatus(mondayLateNight, bangkok("2026-11-18T12:00:00"), BANGKOK),
    ).toEqual({ open: false, closedAllDay: true });
  });

  it("is closed all day after yesterday's overnight range ends on a day without ranges", () => {
    // Monday 18:00–02:00 only; Tuesday 03:00 is after it and Tuesday has no ranges.
    expect(
      openStatus(mondayLateNight, bangkok("2026-11-17T03:00:00"), BANGKOK),
    ).toEqual({ open: false, closedAllDay: true });
  });
});

describe("formatting", () => {
  it("writes minutes as HH:MM", () => {
    expect(formatOpeningTime(0)).toBe("00:00");
    expect(formatOpeningTime(545)).toBe("09:05");
    expect(formatOpeningTime(1440)).toBe("24:00");
    expect(formatOpeningTime(1560)).toBe("02:00");
  });

  it("writes a range with an en dash, wrapping overnight closes and keeping 24:00", () => {
    expect(formatOpeningRange({ opensAt: 480, closesAt: 1020 })).toBe(
      "08:00–17:00",
    );
    expect(formatOpeningRange({ opensAt: 1080, closesAt: 1560 })).toBe(
      "18:00–02:00",
    );
    expect(formatOpeningRange({ opensAt: 1020, closesAt: 1440 })).toBe(
      "17:00–24:00",
    );
  });

  it("says open 24 hours for any 24-hour range", () => {
    expect(formatOpeningRange({ opensAt: 0, closesAt: 1440 })).toBe(
      m.restaurantCard_workingHours_allDay_body(),
    );
    // 10:00–10:00 arrives from the gateway as 600–2040.
    expect(formatOpeningRange({ opensAt: 600, closesAt: 2040 })).toBe(
      m.restaurantCard_workingHours_allDay_body(),
    );
  });
});
