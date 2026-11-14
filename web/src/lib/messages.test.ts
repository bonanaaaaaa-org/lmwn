import { formatNumber } from "@/lib/format";
import { appLocale, intlLocale } from "@/lib/locale";
import { m } from "@/paraglide/messages.js";
import { baseLocale, getLocale, locales } from "@/paraglide/runtime.js";

// web/messages/th.json, through the `@/` alias (relative parent imports are banned).
import catalog from "@/../messages/th.json";

const catalogKeys = Object.keys(catalog).filter((key) => !key.startsWith("$"));
const compiledKeys = new Set(
  Object.entries(m)
    .filter(([, value]) => typeof value === "function")
    .map(([key]) => key),
);

describe("message catalog", () => {
  // A broken plugin path in project.inlang/settings.json compiles an EMPTY catalog and still
  // exits 0; this makes that failure loud instead of a page of missing text.
  it("compiles every key in web/messages/th.json into a message function", () => {
    expect(catalogKeys.length).toBeGreaterThan(0);
    const missing = catalogKeys.filter((key) => !compiledKeys.has(key));
    expect(missing).toEqual([]);
  });

  it("compiles Thai as the base and only locale", () => {
    expect(locales).toEqual(["th"]);
    expect(baseLocale).toBe("th");
    expect(getLocale()).toBe("th");
  });

  it("derives the app locale and the Intl / React Aria tag from Paraglide", () => {
    expect(appLocale).toBe(baseLocale);
    expect(intlLocale).toBe("th-TH");
  });

  it("interpolates params and formats counts like the shared formatter", () => {
    const label = m.rating_ariaLabel({
      rating: formatNumber(4.5),
      count: 1234,
    });

    expect(label).toContain(formatNumber(4.5));
    expect(label).toContain(formatNumber(1234));
    expect(label).not.toContain("1234");
  });

  it("rejects unknown keys and wrong params at type-check time", () => {
    expect(() => {
      // @ts-expect-error: no such message in web/messages/th.json
      m.notFound_nope();
    }).toThrow(TypeError);

    // @ts-expect-error: `count` is missing
    m.rating_ariaLabel({ rating: 4.5 });
    // @ts-expect-error: `total` is not a param of this message
    m.rating_ariaLabel({ rating: 4.5, count: 12, total: 5 });
    // @ts-expect-error: params are required
    m.rating_ariaLabel();
  });
});
