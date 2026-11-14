import type { ImageSource } from "@/components/common/ResponsiveImage";

import type { Photo } from "./types";

const thaiDateFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A date in Thai short form with the Buddhist-calendar year, as diners read it:
 * "2024-03-10T12:00:00Z" → "10 มี.ค. 2567". The day is taken in `timeZone`.
 */
export function formatThaiDate(iso: string, timeZone = "Asia/Bangkok"): string {
  let formatter = thaiDateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    });
    thaiDateFormatters.set(timeZone, formatter);
  }
  return formatter.format(new Date(iso));
}

/** The calendar date (YYYY-MM-DD) of `iso` in `timeZone`, for `<time dateTime>`. */
export function toIsoDate(iso: string, timeZone = "Asia/Bangkok"): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

/** A Rating to one decimal place: 4.29 → "4.3". */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
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

/** "รูปที่ 2 จาก 4 ของ ONIBUS COFFEE"; without a name (Unavailable Restaurant) "รูปที่ 2 จาก 4". */
export function photoAlt(
  position: number,
  total: number,
  name?: string,
): string {
  const base = `รูปที่ ${position} จาก ${total}`;
  return name ? `${base} ของ ${name}` : base;
}

// The image server's URLs carry the rendered size: /r/{width}/{height}/{file}.
const SIZE_IN_URL = /\/r\/(\d+)\/\d+\//;
const FALLBACK_WIDTH = { small: 480, large: 1080 } as const;

function widthOf(url: string, fallback: number): number {
  const match = SIZE_IN_URL.exec(url);
  return match?.[1] ? Number(match[1]) : fallback;
}

/** A gateway Photo as `srcset` candidates: its small and large URLs with their widths. */
export function photoSources(photo: Photo): ImageSource[] {
  return [
    {
      url: photo.smallUrl,
      width: widthOf(photo.smallUrl, FALLBACK_WIDTH.small),
    },
    {
      url: photo.largeUrl,
      width: widthOf(photo.largeUrl, FALLBACK_WIDTH.large),
    },
  ];
}
