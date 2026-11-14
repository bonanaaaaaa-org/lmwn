import { facebookUrl, instagramUrl, lineUrl, mapUrl, telHref } from "./links";

describe("Restaurant links", () => {
  it("opens Google Maps at the Restaurant's coordinates", () => {
    expect(mapUrl(13.7275, 100.5469)).toBe(
      "https://www.google.com/maps/search/?api=1&query=13.7275%2C100.5469",
    );
  });

  it("dials only the digits", () => {
    expect(telHref("093-916 4541")).toBe("tel:0939164541");
  });

  it("turns handles into profile URLs", () => {
    expect(lineUrl("@rise.bkk")).toBe("https://line.me/R/ti/p/%40rise.bkk");
    expect(lineUrl("rise.bkk")).toBe("https://line.me/R/ti/p/%40rise.bkk");
    expect(instagramUrl("f.i.x.bkk")).toBe(
      "https://www.instagram.com/f.i.x.bkk/",
    );
    expect(facebookUrl("fixcoffeebkk")).toBe(
      "https://www.facebook.com/fixcoffeebkk",
    );
  });

  it("keeps an account that is already a URL", () => {
    expect(facebookUrl("https://facebook.com/x")).toBe(
      "https://facebook.com/x",
    );
  });
});
