import { m } from "@/paraglide/messages.js";

import { photoAlt, photoRatio, photoSources } from "./photos";

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

describe("photoRatio", () => {
  it("reads width over height from the image server URL", () => {
    expect(photoRatio("http://localhost:7777/r/1080/1920/a.jpg")).toBe(0.5625);
    expect(photoRatio("http://localhost:7777/r/1080/1350/a.jpg")).toBe(0.8);
  });

  it("falls back to a 9:16 portrait for other or empty URLs", () => {
    expect(photoRatio("b.jpg")).toBe(0.5625);
    expect(photoRatio("")).toBe(0.5625);
    expect(photoRatio("http://localhost:7777/r/0/0/a.jpg")).toBe(0.5625);
  });
});

describe("photoAlt", () => {
  it("names the Restaurant when it is known, and leaves it out otherwise", () => {
    expect(photoAlt(2, 4, "RISE")).toBe(
      m.restaurantCard_photoStrip_photo_alt({
        position: 2,
        total: 4,
        restaurant: "RISE",
      }),
    );
    expect(photoAlt(1, 3)).toBe(
      m.restaurantCard_photoStrip_photo_unnamedAlt({ position: 1, total: 3 }),
    );
  });
});
