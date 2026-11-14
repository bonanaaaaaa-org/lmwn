import { readFileSync } from "node:fs";

/** The plain (non-interpolated) catalog messages the e2e specs assert on. */
type MessageKey =
  | "app_title"
  | "app_skipLink_label"
  | "app_header_tagline_body"
  | "app_footer_body"
  | "guideIndex_title"
  | "notFound_title"
  | "notFound_body"
  | "notFound_backLink_label";

const catalog = JSON.parse(
  readFileSync(new URL("../../web/messages/th.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

/**
 * The web app's Thai catalog (`web/messages/th.json`), so specs assert on the copy the app
 * renders instead of re-typing it. Throws if a key is missing or isn't a plain string.
 */
export function message(key: MessageKey): string {
  const value = catalog[key];
  if (typeof value !== "string") {
    throw new Error(`web/messages/th.json has no plain message "${key}"`);
  }
  return value;
}
