import {
  formatDate,
  formatNumber,
  formatPhoneNumber,
  formatRating,
  toIsoDate,
} from "@/lib/format";
import { formattedDates } from "@/test-utils/fixtures/sampleContent";

describe("formatDate", () => {
  it("shows day, short Thai month and Buddhist year by default", () => {
    expect(formatDate(new Date("2024-03-10T12:00:00+07:00"))).toBe(
      formattedDates.march10th2024,
    );
  });

  it("accepts ISO 8601 strings and timestamps", () => {
    expect(formatDate("2024-03-10T12:00:00.000Z")).toBe(
      formattedDates.march10th2024,
    );
    expect(formatDate(Date.UTC(2024, 2, 10, 5))).toBe(
      formattedDates.march10th2024,
    );
  });

  it("takes the day in Thailand time, whatever the device's time zone", () => {
    // 20:00 UTC on 9 March is already 03:00 on 10 March in Bangkok (UTC+7).
    expect(formatDate("2024-03-09T20:00:00Z")).toBe(
      formattedDates.march10th2024,
    );
  });

  it("takes the day in another time zone when asked, keeping the default fields", () => {
    expect(formatDate("2024-03-09T20:00:00Z", { timeZone: "UTC" })).not.toBe(
      formattedDates.march10th2024,
    );
    expect(
      formatDate("2024-03-10T20:00:00Z", { timeZone: "America/New_York" }),
    ).toBe(formattedDates.march10th2024);
  });

  it("passes other fields through to Intl, keeping the Buddhist calendar", () => {
    expect(formatDate("2024-03-10", { year: "numeric" })).toContain("2567");
  });
});

describe("toIsoDate", () => {
  it("gives the YYYY-MM-DD calendar date in Thailand time by default", () => {
    expect(toIsoDate("2024-03-09T20:00:00Z")).toBe("2024-03-10");
  });

  it("uses the given time zone", () => {
    expect(toIsoDate("2024-03-09T20:00:00Z", "UTC")).toBe("2024-03-09");
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("passes options to Intl.NumberFormat", () => {
    expect(formatNumber(4.567, { maximumFractionDigits: 1 })).toBe("4.6");
    expect(formatNumber(4, { minimumFractionDigits: 1 })).toBe("4.0");
  });
});

describe("formatRating", () => {
  it("rounds to exactly one decimal place", () => {
    expect(formatRating(4.29)).toBe("4.3");
    expect(formatRating(4)).toBe("4.0");
    expect(formatRating(0)).toBe("0.0");
    expect(formatRating(5)).toBe("5.0");
  });
});

describe("formatPhoneNumber", () => {
  it.each([
    ["0939164541", "093 916 4541"],
    ["021234567", "02 123 4567"],
    ["053123456", "053 123 456"],
    ["+66 2 123", "+66 2 123"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatPhoneNumber(input)).toBe(expected);
  });
});
