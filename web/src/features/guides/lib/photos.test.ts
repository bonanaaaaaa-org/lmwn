import { photoSources } from "./photos";

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
