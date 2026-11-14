import { useSyncExternalStore } from "react";

/**
 * Dark mode (#47). The colour tokens in `globals.css` are `light-dark()` pairs, so the theme is
 * whichever side `color-scheme` picks: the system's by default, or a viewer's saved choice,
 * which `data-theme` on `<html>` fixes. The document head applies a saved choice before first
 * paint (`themeScript`), so a reload never flashes the other theme.
 */

/** "system" follows `prefers-color-scheme`, live; "light" and "dark" override it. */
export type ThemeChoice = "system" | "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = [
  "system",
  "light",
  "dark",
];

/** Where a viewer's choice lives in `localStorage`. "system" is stored as no entry. */
export const THEME_STORAGE_KEY = "hidden-gems-theme";

/**
 * `<meta name="theme-color">` for each theme: the browser's toolbar and the installed app's
 * title bar: saffron (`--color-accent`, the PWA manifest's `theme_color`) in light, and the dark
 * page background (`--color-background`) in dark, so the bar runs into the page. A unit test
 * keeps them in step with the tokens. Meta tags can't read CSS custom properties, hence the copies.
 */
export const THEME_COLORS = { light: "#f2b705", dark: "#121211" } as const;

/**
 * Sets `data-theme` on `<html>` for a saved "light" or "dark" (anything else means "system")
 * and points the `theme-color` metas at the chosen theme. With "system", each meta takes the
 * colour for its own `media` query.
 *
 * The metas are created here, on first call (from the head script), not rendered by React:
 * React 19 matches head `<meta>` tags by all their attributes during hydration, so a `content`
 * changed before hydration would make it add its own copies with the build-time colours.
 *
 * Must stay self-contained (no imports, no outer variables): it is also inlined into the HTML
 * head (see `themeScript`).
 */
export function applyTheme(
  choice: string | null | undefined,
  colors: { light: string; dark: string },
): void {
  const root = document.documentElement;
  const fixed = choice === "light" || choice === "dark" ? choice : undefined;
  if (fixed) root.dataset.theme = fixed;
  else delete root.dataset.theme;
  const selector = 'meta[name="theme-color"]';
  if (!document.querySelector(selector)) {
    for (const scheme of ["light", "dark"]) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.media = "(prefers-color-scheme: " + scheme + ")";
      document.head.appendChild(meta);
    }
  }
  const metas = document.querySelectorAll<HTMLMetaElement>(selector);
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i]!;
    meta.content =
      colors[fixed ?? (/dark/.test(meta.media) ? "dark" : "light")];
  }
}

/** The head script: applies the saved choice before the body paints. A few hundred bytes. */
export function themeScript(): string {
  return `(function(){var c;try{c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}(${applyTheme.toString()})(c,${JSON.stringify(THEME_COLORS)})})();`;
}

function parseChoice(value: string | null | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** The saved choice; "system" when there is none or storage is unavailable. */
export function readThemeChoice(): ThemeChoice {
  try {
    return parseChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();

/**
 * Applies `choice` at once and saves it for this viewer. When storage is unavailable (private
 * mode, blocked site data) the choice still applies until the page reloads.
 */
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage unavailable: keep the choice for this page only.
  }
  current = choice;
  switchWithoutTransitions(() => applyTheme(choice, THEME_COLORS));
  for (const listener of listeners) listener();
}

/**
 * Runs a theme change with CSS transitions off for one frame (`data-theme-switching`, see
 * `globals.css`). Otherwise text colours flip at once while backgrounds fade, and a chip shows
 * light text on a light fill for a moment.
 */
function switchWithoutTransitions(change: () => void): void {
  const root = document.documentElement;
  root.dataset.themeSwitching = "";
  change();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => delete root.dataset.themeSwitching),
  );
}

/** The choice made on this page; until then, the saved one. */
let current: ThemeChoice | undefined;

function getSnapshot(): ThemeChoice {
  return current ?? readThemeChoice();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the choice: follow it here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    const choice = parseChoice(event.newValue);
    current = choice;
    switchWithoutTransitions(() => applyTheme(choice, THEME_COLORS));
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The viewer's theme choice and a setter. Renders "system" in the build-time HTML. */
export function useThemeChoice(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    getSnapshot,
    () => "system",
  );
  return [choice, setThemeChoice];
}
