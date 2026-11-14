import { readFileSync } from "node:fs";

/** The plain catalog messages the e2e specs assert on. */
type MessageKey =
  | "app_title"
  | "app_skipLink_label"
  | "header_tagline_body"
  | "header_backLink_ariaLabel"
  | "app_footer_body"
  | "guideIndex_title"
  | "guideIndex_emptyState_body"
  | "guideIndex_emptyState_action_label"
  | "searchField_label"
  | "guide_backLink_label"
  | "guide_notFound_title"
  | "guide_errorPanel_title"
  | "guideIndex_skeleton_label"
  | "errorPanel_retry_label"
  | "restaurantCard_readMore_label"
  | "restaurantCard_readMore_expandedLabel"
  | "restaurantCard_unavailable_body"
  | "notFound_title"
  | "notFound_body"
  | "notFound_backLink_label"
  | "openStatus_open_label"
  | "openStatus_closed_todayLabel"
  | "restaurantCard_workingHours_title"
  | "restaurantCard_workingHours_closed_body"
  | "restaurantCard_workingHours_toggle_expandedLabel"
  | "restaurantCard_workingHours_monday_label"
  | "restaurantCard_workingHours_tuesday_label"
  | "restaurantCard_workingHours_wednesday_label"
  | "restaurantCard_workingHours_thursday_label"
  | "restaurantCard_workingHours_friday_label"
  | "restaurantCard_workingHours_saturday_label"
  | "restaurantCard_workingHours_sunday_label"
  | "guideHeader_share_label"
  | "guideHeader_share_copiedBody";

/** The interpolated catalog messages the e2e specs assert on, with their params. */
interface FormatParams {
  guideIndex_resultCount_body: { count: number };
  guideIndex_emptyState_searchTitle: { query: string };
  guideIndex_errorPanel_searchBody: { query: string };
  guideIndex_search_tooLongMessage: { max: number };
  guideCard_restaurantCount_body: { count: number };
  restaurantCard_photoStrip_photo_alt: {
    position: number;
    total: number;
    restaurant: string;
  };
  restaurantCard_photoStrip_photo_unnamedAlt: {
    position: number;
    total: number;
  };
  openStatus_closed_opensAtLabel: { time: string };
  restaurantCard_workingHours_today_body: { hours: string };
  restaurantCard_workingHours_toggle_closedDaysLabel: { days: string };
  restaurantCard_workingHours_week_todayLabel: { day: string };
  restaurantCard_share_ariaLabel: { restaurant: string };
  restaurantCard_share_copiedBody: { restaurant: string };
  lightbox_counter_body: { position: number; total: number };
}

const catalog = JSON.parse(
  readFileSync(new URL("../../web/messages/th.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const numberFormat = new Intl.NumberFormat("th-TH");

function lookup(key: string): string {
  const value = catalog[key];
  if (typeof value !== "string") {
    throw new Error(`web/messages/th.json has no message "${key}"`);
  }
  return value;
}

/**
 * A plain message from the web app's Thai catalog (`web/messages/th.json`), so specs assert on
 * the copy the app renders instead of re-typing it.
 */
export function message(key: MessageKey): string {
  return lookup(key);
}

/**
 * An interpolated message with its `{name}` / `{name: number}` placeholders filled in, numbers
 * formatted for `th-TH` as Paraglide does.
 */
export function format<K extends keyof FormatParams>(
  key: K,
  params: FormatParams[K],
): string {
  const values: Record<string, string | number> = { ...params };
  return lookup(key).replace(
    /\{\s*(\w+)\s*(:\s*number[^}]*)?\}/g,
    (_placeholder, name: string, numberType?: string) => {
      const value = values[name];
      if (value === undefined) {
        throw new Error(`"${key}" needs the param "${name}"`);
      }
      return numberType && typeof value === "number"
        ? numberFormat.format(value)
        : String(value);
    },
  );
}
