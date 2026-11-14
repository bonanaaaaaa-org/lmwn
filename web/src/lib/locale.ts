import { baseLocale, type Locale } from "@/paraglide/runtime.js";

/**
 * The one locale setting. Paraglide's base (and only) locale, set in project.inlang/settings.json,
 * drives the message catalog, `<html lang>`, React Aria's `I18nProvider` and every `Intl` formatter.
 */
export const appLocale: Locale = baseLocale;

/** Paraglide locale → full BCP 47 tag for React Aria and `Intl` (region picks Thai conventions). */
const INTL_LOCALES = {
  th: "th-TH",
} as const satisfies Record<Locale, string>;

/** BCP 47 tag for React Aria's `I18nProvider` and `Intl` APIs: `th-TH`. */
export const intlLocale: string = INTL_LOCALES[appLocale];
