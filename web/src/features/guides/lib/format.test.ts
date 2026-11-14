import {
  formatPhoneNumber,
  formatRating,
  formatThaiDate,
  photoAlt,
  photoSources,
  toIsoDate,
} from "./format";

describe("formatThaiDate", () => {
  it("writes the day, short Thai month and Buddhist-calendar year", () => {
    expect(formatThaiDate("2024-03-10T12:00:00.000Z")).toBe("10 มี.ค. 2567");
  });

  it("takes the day in Thailand time, not UTC", () => {
    // 20:00 UTC on 9 March is 03:00 on 10 March in Bangkok.
    expect(formatThaiDate("2024-03-09T20:00:00Z")).toBe("10 มี.ค. 2567");
    expect(toIsoDate("2024-03-09T20:00:00Z")).toBe("2024-03-10");
  });
});

describe("formatRating", () => {
  it("rounds to one decimal place", () => {
    expect(formatRating(4.29)).toBe("4.3");
    expect(formatRating(4)).toBe("4.0");
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

describe("photoAlt", () => {
  it("numbers the photo and names the Restaurant", () => {
    expect(photoAlt(2, 4, "ONIBUS COFFEE")).toBe(
      "รูปที่ 2 จาก 4 ของ ONIBUS COFFEE",
    );
  });

  it("leaves the name out when the Restaurant is unavailable", () => {
    expect(photoAlt(1, 3)).toBe("รูปที่ 1 จาก 3");
  });
});

describe("photoSources", () => {
  it("reads each width from the image server URL", () => {
    expect(
      photoSources({
        id: "p",
        smallUrl: "http://localhost:7777/r/480/854/a.jpg",
        largeUrl: "http://localhost:7777/r/1080/1920/a.jpg",
      }),
    ).toEqual([
      { url: "http://localhost:7777/r/480/854/a.jpg", width: 480 },
      { url: "http://localhost:7777/r/1080/1920/a.jpg", width: 1080 },
    ]);
  });

  it("falls back to typical widths for other URLs", () => {
    expect(
      photoSources({ id: "p", smallUrl: "a.jpg", largeUrl: "b.jpg" }).map(
        (source) => source.width,
      ),
    ).toEqual([480, 1080]);
  });
});
