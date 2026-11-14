import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, renderHook } from "@testing-library/react";

import {
  applyTheme,
  readThemeChoice,
  setThemeChoice,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  themeScript,
  useThemeChoice,
} from "./theme";

function metaContents() {
  return [
    ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ].map((meta) => meta.content);
}

describe("theme", () => {
  afterEach(() => {
    setThemeChoice("system");
    localStorage.clear();
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.remove());
    vi.restoreAllMocks();
  });

  it("adds one theme-color meta per system theme, once", () => {
    applyTheme(null, THEME_COLORS);
    applyTheme("dark", THEME_COLORS);
    expect(
      [
        ...document.querySelectorAll<HTMLMetaElement>(
          'meta[name="theme-color"]',
        ),
      ].map((meta) => meta.media),
    ).toEqual([
      "(prefers-color-scheme: light)",
      "(prefers-color-scheme: dark)",
    ]);
  });

  it("fixes data-theme and both theme-color metas for a saved light or dark", () => {
    applyTheme("dark", THEME_COLORS);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(metaContents()).toEqual([THEME_COLORS.dark, THEME_COLORS.dark]);

    applyTheme("light", THEME_COLORS);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(metaContents()).toEqual([THEME_COLORS.light, THEME_COLORS.light]);
  });

  it("follows the system for no choice or an unknown value", () => {
    applyTheme("dark", THEME_COLORS);
    applyTheme("sepia", THEME_COLORS);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(metaContents()).toEqual([THEME_COLORS.light, THEME_COLORS.dark]);
  });

  it("the head script applies the saved choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    // oxlint-disable-next-line no-new-func -- runs the inline head script as the browser would.
    new Function(themeScript())();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("the head script falls back to the system when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    // oxlint-disable-next-line no-new-func -- runs the inline head script as the browser would.
    expect(() => new Function(themeScript())()).not.toThrow();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(readThemeChoice()).toBe("system");
  });

  it("saves a choice, and system removes it", () => {
    setThemeChoice("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    setThemeChoice("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("still applies a choice when storage can't save it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useThemeChoice());
    act(() => result.current[1]("dark"));
    expect(result.current[0]).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows a choice made in another tab", () => {
    const { result } = renderHook(() => useThemeChoice());
    act(() => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "dark",
        }),
      );
    });
    expect(result.current[0]).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps the theme-color copies in step with the colour tokens", () => {
    const css = readFileSync(
      resolve(__dirname, "../styles/globals.css"),
      "utf8",
    );
    const accent = /--color-accent:\s*(#[0-9a-f]+);/.exec(css)?.[1];
    const darkBackground =
      /--color-background:\s*light-dark\([^,]+,\s*(#[0-9a-f]+)\)/.exec(
        css,
      )?.[1];
    const expand = (hex = "") =>
      hex.length === 4
        ? `#${[...hex.slice(1)].map((c) => c + c).join("")}`
        : hex;
    expect(expand(accent)).toBe(THEME_COLORS.light);
    expect(expand(darkBackground)).toBe(THEME_COLORS.dark);
  });
});
