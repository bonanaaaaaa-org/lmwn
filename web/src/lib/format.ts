import { intlLocale } from "@/lib/locale";

/** Restaurant hours and dates are Thai time, wherever the diner's device is. */
export const APP_TIME_ZONE = "Asia/Bangkok";

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

/** Creating `Intl` formatters is costly; keep one per distinct options object. */
function cached<T>(cache: Map<string, T>, options: object, create: () => T): T {
  const key = JSON.stringify(options);
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = create();
    cache.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a date for the UI in the Buddhist calendar, in Thailand time. The default is day,
 * short Thai month and Buddhist year (2024-03-10 → day 10, March, 2567; see `formattedDates` in
 * the test fixtures); pass `options` to change the fields. Accepts a `Date`, an ISO 8601 string
 * or a timestamp in milliseconds.
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  const resolved: Intl.DateTimeFormatOptions = {
    calendar: "buddhist",
    timeZone: APP_TIME_ZONE,
    ...options,
  };
  const formatter = cached(
    dateFormatters,
    resolved,
    () => new Intl.DateTimeFormat(intlLocale, resolved),
  );
  return formatter.format(date instanceof Date ? date : new Date(date));
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
