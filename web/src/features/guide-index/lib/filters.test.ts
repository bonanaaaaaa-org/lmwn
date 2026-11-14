import {
  addTag,
  buildIndexHref,
  isSearchTextTooLong,
  normaliseSearchText,
  parseFilters,
  toggleTag,
} from "./filters";

describe("parseFilters", () => {
  it("reads q and every repeated tag from the URL", () => {
    const params = new URLSearchParams("q=คาเฟ่&tag=กาแฟ&tag=One+Bangkok");

    expect(parseFilters(params)).toEqual({
      q: "คาเฟ่",
      tags: ["กาแฟ", "One Bangkok"],
    });
  });

  it("drops repeated and empty Tags, keeping the first order", () => {
    const params = new URLSearchParams("tag=b&tag=a&tag=b&tag=");

    expect(parseFilters(params)).toEqual({ q: "", tags: ["b", "a"] });
  });

  it("defaults to no search text and no Tags", () => {
    expect(parseFilters(new URLSearchParams())).toEqual({ q: "", tags: [] });
  });
});

describe("normaliseSearchText", () => {
  it("trims and treats whitespace-only text as empty", () => {
    expect(normaliseSearchText("  คาเฟ่ ")).toBe("คาเฟ่");
    expect(normaliseSearchText("   ")).toBe("");
  });

  it("NFC-normalises so differently composed text is the same search", () => {
    expect(normaliseSearchText("café")).toBe("café");
  });
});

describe("isSearchTextTooLong", () => {
  it("allows 100 characters and rejects 101", () => {
    expect(isSearchTextTooLong("ก".repeat(100))).toBe(false);
    expect(isSearchTextTooLong("ก".repeat(101))).toBe(true);
  });

  it("counts characters, not UTF-16 code units", () => {
    expect(isSearchTextTooLong("🍜".repeat(100))).toBe(false);
  });

  it("ignores surrounding whitespace, which is never sent", () => {
    expect(isSearchTextTooLong(` ${"a".repeat(100)} `)).toBe(false);
  });
});

describe("buildIndexHref", () => {
  it("is the bare Guide Index without filters", () => {
    expect(buildIndexHref({ q: "", tags: [] })).toBe("/");
  });

  it("encodes q and repeats tag once per Tag", () => {
    const href = buildIndexHref({ q: "คาเฟ่ลับ", tags: ["กาแฟ", "One Bangkok"] });
    const url = new URL(href, "http://localhost");

    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("q")).toBe("คาเฟ่ลับ");
    expect(url.searchParams.getAll("tag")).toEqual(["กาแฟ", "One Bangkok"]);
  });

  it("omits whitespace-only search text", () => {
    expect(buildIndexHref({ q: "  ", tags: ["กาแฟ"] })).toBe(
      `/?${new URLSearchParams({ tag: "กาแฟ" }).toString()}`,
    );
  });
});

describe("addTag", () => {
  it("adds a Tag to the current search and Tags", () => {
    expect(addTag({ q: "คาเฟ่", tags: ["กาแฟ"] }, "กรุงเทพ")).toEqual({
      q: "คาเฟ่",
      tags: ["กาแฟ", "กรุงเทพ"],
    });
  });

  it("does not repeat a Tag that is already selected", () => {
    expect(addTag({ q: "", tags: ["กาแฟ"] }, "กาแฟ")).toEqual({
      q: "",
      tags: ["กาแฟ"],
    });
  });
});

describe("toggleTag", () => {
  it("adds an unselected Tag and removes a selected one", () => {
    expect(toggleTag(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleTag(["a", "b"], "a")).toEqual(["b"]);
  });
});
