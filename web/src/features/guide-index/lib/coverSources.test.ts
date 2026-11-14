import { coverSources } from "./coverSources";

describe("coverSources", () => {
  it("reads each image's width from the image server's /r/{width}/{height}/ path", () => {
    expect(
      coverSources({
        id: "p",
        smallUrl: "http://localhost:7777/r/854/480/a.jpg",
        largeUrl: "http://localhost:7777/r/1920/1080/a.jpg",
      }),
    ).toEqual([
      { url: "http://localhost:7777/r/854/480/a.jpg", width: 854 },
      { url: "http://localhost:7777/r/1920/1080/a.jpg", width: 1920 },
    ]);
  });

  it("falls back to 480 and 1080 wide when the URL has no size", () => {
    expect(
      coverSources({ id: "p", smallUrl: "/s.jpg", largeUrl: "/l.jpg" }),
    ).toEqual([
      { url: "/s.jpg", width: 480 },
      { url: "/l.jpg", width: 1080 },
    ]);
  });
});
