import type { WorkingDay } from "./types";

/**
 * Open Now, judged in the gateway's `timeZone` (Thailand time) whatever the viewer's own
 * clock says. Working Hours arrive normalised: minutes since midnight of the opening day,
 * ranges are [opensAt, closesAt), and a range that runs past midnight keeps a `closesAt`
 * above 1440. A day that isn't listed, or has no ranges, is closed.
 *
 * Pure functions: pass "now" in, so the Open Now filter (#13) and the card share them.
 */

const MINUTES_PER_DAY = 1440;

type OpeningRange = WorkingDay["ranges"][number];

/** An ISO weekday (1 = Monday … 7 = Sunday) and minutes since midnight. */
export interface WeekdayAndMinutes {
  day: number;
  minutes: number;
}

const ISO_WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The weekday and minutes since midnight of `now` on the wall clock in `timeZone`. */
export function weekdayAndMinutes(
  now: Date,
  timeZone: string,
): WeekdayAndMinutes {
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const part of formatterFor(timeZone).formatToParts(now)) {
    if (part.type === "weekday") day = ISO_WEEKDAY[part.value] ?? 0;
    else if (part.type === "hour") hour = Number(part.value);
    else if (part.type === "minute") minute = Number(part.value);
  }
  return { day, minutes: hour * 60 + minute };
}

/** The ranges of ISO weekday `day`; none when the day is missing. */
export function rangesOn(
  workingHours: readonly WorkingDay[],
  day: number,
): readonly OpeningRange[] {
  return (
    workingHours.find((workingDay) => workingDay.day === day)?.ranges ?? []
  );
}

const previousDay = (day: number) => (day === 1 ? 7 : day - 1);

/**
 * The range covering the current minute, as minutes since today's midnight: one of today's
 * ranges, or one of yesterday's that runs past midnight beyond now.
 */
function coveringRange(
  workingHours: readonly WorkingDay[],
  { day, minutes }: WeekdayAndMinutes,
): OpeningRange | undefined {
  const today = rangesOn(workingHours, day).find(
    (range) => range.opensAt <= minutes && minutes < range.closesAt,
  );
  if (today) return today;
  const yesterday = rangesOn(workingHours, previousDay(day)).find(
    (range) => minutes + MINUTES_PER_DAY < range.closesAt,
  );
  return (
    yesterday && {
      opensAt: yesterday.opensAt - MINUTES_PER_DAY,
      closesAt: yesterday.closesAt - MINUTES_PER_DAY,
    }
  );
}

/**
 * Whether the Restaurant is Open Now: one of today's ranges covers the current minute, or
 * one of yesterday's ranges runs past midnight beyond it.
 */
export function isOpenNow(
  workingHours: readonly WorkingDay[],
  now: Date,
  timeZone: string,
): boolean {
  return (
    coveringRange(workingHours, weekdayAndMinutes(now, timeZone)) !== undefined
  );
}

/** Open Now with the times around it, in minutes since today's midnight. */
export interface OpenStatusValue {
  open: boolean;
  /** While open: when the current range closes (above 1440 when that is after midnight). */
  closesAt?: number;
  /** While open: the current range is yesterday's, running past midnight. */
  fromYesterday?: boolean;
  /** While closed: today's next opening; absent when it doesn't open again today. */
  opensAt?: number;
}

export function openStatus(
  workingHours: readonly WorkingDay[],
  now: Date,
  timeZone: string,
): OpenStatusValue {
  const clock = weekdayAndMinutes(now, timeZone);
  const range = coveringRange(workingHours, clock);
  if (range) {
    return range.opensAt < 0
      ? { open: true, closesAt: range.closesAt, fromYesterday: true }
      : { open: true, closesAt: range.closesAt };
  }
  const later = rangesOn(workingHours, clock.day)
    .map((todayRange) => todayRange.opensAt)
    .filter((opensAt) => opensAt > clock.minutes);
  return later.length > 0
    ? { open: false, opensAt: Math.min(...later) }
    : { open: false };
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Minutes as a 24-hour time: 545 → "09:05". Past midnight wraps (1560 → "02:00"); exactly
 * 1440 stays "24:00", midnight at the end of the opening day.
 */
export function formatOpeningTime(minutes: number): string {
  const time = minutes > MINUTES_PER_DAY ? minutes - MINUTES_PER_DAY : minutes;
  return `${pad(Math.floor(time / 60))}:${pad(time % 60)}`;
}

/** "08:00–17:00"; an overnight close wraps ("18:00–02:00"); a 24-hour range is "เปิด 24 ชั่วโมง". */
export function formatOpeningRange(range: OpeningRange): string {
  if (range.closesAt - range.opensAt === MINUTES_PER_DAY) return "เปิด 24 ชั่วโมง";
  return `${formatOpeningTime(range.opensAt)}–${formatOpeningTime(range.closesAt)}`;
}
