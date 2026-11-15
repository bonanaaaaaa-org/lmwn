import { intlLocale } from "@/lib/locale";

/**
 * The one formatting module: every date, number, Rating and phone number shown in the UI goes
 * through here (counts inside copy use Paraglide's `{count: number}`). Components never build
 * `Intl` formatters or call `toLocaleString` / `toFixed` for display themselves.
 */

/** Restaurant hours and dates are Thai time unless the data says otherwise. */
const DEFAULT_TIME_ZONE = "Asia/Bangkok";

const DEFAULT_DATE_FIELDS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/** Options that pick what a date shows; without any, `formatDate` uses DEFAULT_DATE_FIELDS. */
const DATE_FIELD_OPTIONS = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeZoneName",
  "dateStyle",
  "timeStyle",
] as const satisfies readonly (keyof Intl.DateTimeFormatOptions)[];

const numberFormatters = new Map<string, Intl.NumberFormat>();

/** Creating `Intl` formatters is costly; keep one per locale and options. */
function cached<T>(cache: Map<string, T>, key: unknown, create: () => T): T {
  const cacheKey = JSON.stringify(key);
  let formatter = cache.get(cacheKey);
  if (!formatter) {
    formatter = create();
    cache.set(cacheKey, formatter);
  }
  return formatter;
}

/** A moment in time: a `Temporal.Instant`, or an ISO 8601 string with an offset (`…Z`, `…+07:00`). */
export type InstantLike = Temporal.Instant | string;

function toInstant(instant: InstantLike): Temporal.Instant {
  return typeof instant === "string" ? Temporal.Instant.from(instant) : instant;
}

/**
 * Formats a date for the UI in the Buddhist calendar, by default in Thailand time. Without
 * date fields in `options` it shows day, short Thai month and Buddhist year (2024-03-10 → day
 * 10, March, 2567; see `formattedDates` in the test fixtures). Pass `timeZone` to take the day in
 * another zone (e.g. a Guide's own `timeZone`).
 */
export function formatDate(
  instant: InstantLike,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const hasFields = DATE_FIELD_OPTIONS.some(
    (key) => options[key] !== undefined,
  );
  // `Instant#toLocaleString` rather than a cached `Intl.DateTimeFormat`: the browser's own Intl
  // can't format the polyfill's Temporal values (Safari; see `@/lib/temporal`).
  return toInstant(instant).toLocaleString(intlLocale, {
    calendar: "buddhist",
    timeZone: DEFAULT_TIME_ZONE,
    ...(hasFields ? {} : DEFAULT_DATE_FIELDS),
    ...options,
  });
}

/** The wall clock of `instant` in `timeZone`. */
function zoned(instant: InstantLike, timeZone: string): Temporal.ZonedDateTime {
  return toInstant(instant).toZonedDateTimeISO(timeZone);
}

/**
 * The calendar date (YYYY-MM-DD, Gregorian) of `instant` in `timeZone`, for `<time dateTime>`.
 * Machine-readable, so it doesn't follow the UI locale.
 */
export function toIsoDate(
  instant: InstantLike,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return zoned(instant, timeZone).toPlainDate().toString();
}

/**
 * The wall clock of `instant` in `timeZone`: ISO weekday (1 = Monday … 7 = Sunday) and minutes
 * since midnight.
 */
export function wallClock(
  instant: InstantLike,
  timeZone: string = DEFAULT_TIME_ZONE,
): { day: number; minutes: number } {
  const { dayOfWeek, hour, minute } = zoned(instant, timeZone);
  return { day: dayOfWeek, minutes: hour * 60 + minute };
}

/** Formats a number for the UI (`th-TH` grouping and decimals); `options` go to `Intl.NumberFormat`. */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  const formatter = cached(
    numberFormatters,
    options,
    () => new Intl.NumberFormat(intlLocale, options),
  );
  return formatter.format(value);
}

/** A Rating to exactly one decimal place: 4.29 → "4.3", 4 → "4.0". */
export function formatRating(rating: number): string {
  return formatNumber(rating, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Groups a Thai phone number for reading: mobiles 3-3-4 ("093 916 4541"), Bangkok
 * landlines 2-3-4 ("02 123 4567"), other landlines 3-3-3. Anything else is left as is.
 */
export function formatPhoneNumber(phoneNo: string): string {
  const digits = phoneNo.replaceAll(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phoneNo;
}
