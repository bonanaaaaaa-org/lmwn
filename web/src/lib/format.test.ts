import { formatDate, formatNumber } from "@/lib/format";
import { formattedDates } from "@/test-utils/fixtures/sampleContent";

describe("formatDate", () => {
  it("shows day, short Thai month and Buddhist year by default", () => {
    expect(formatDate(new Date("2024-03-10T12:00:00+07:00"))).toBe(
      formattedDates.march10th2024,
    );
  });

  it("accepts ISO 8601 strings and timestamps", () => {
    expect(formatDate("2024-03-10")).toBe(formattedDates.march10th2024);
    expect(formatDate(Date.UTC(2024, 2, 10, 5))).toBe(
      formattedDates.march10th2024,
    );
  });

  it("uses Thailand time, whatever the device's time zone", () => {
    // 20:00 UTC on 9 March is already 03:00 on 10 March in Bangkok (UTC+7).
    expect(formatDate("2024-03-09T20:00:00Z")).toBe(
      formattedDates.march10th2024,
    );
  });

  it("passes other fields through to Intl, keeping the Buddhist calendar", () => {
    expect(formatDate("2024-03-10", { year: "numeric" })).toContain("2567");
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
