/**
 * Filtering and sorting a Guide's Restaurants (the Guide page toolbar). Pure functions: the
 * page reads the state from the URL and passes "now" in, so Open Now is testable.
 *
 * URL: `?category=A&category=B&openNow=1&delivery=1&pickup=1&official=1&sort=rating` — `category`
 * repeated once per Category (RFC 3986 style, like the Guide Index's `tag`); guide order is
 * the default sort and is left out.
 */

import { isOpenNow } from "./openNow";
import type { GuideItem, Restaurant } from "./types";

/** `guide` keeps the editor's order; `rating` puts the best rated first. */
export type RestaurantSort = "guide" | "rating";

export interface RestaurantFilters {
  /** Selected Categories, in the order they were chosen; a Restaurant needs any one. */
  categories: string[];
  openNow: boolean;
  delivery: boolean;
  pickup: boolean;
  /** Official Restaurants only (`restaurant.official`). */
  official: boolean;
  sort: RestaurantSort;
}

export const NO_RESTAURANT_FILTERS: RestaurantFilters = {
  categories: [],
  openNow: false,
  delivery: false,
  pickup: false,
  official: false,
  sort: "guide",
};

const ON = "1";

const unique = (values: readonly string[]) => [...new Set(values)];

/** Reads the filters from the URL; empty, repeated and unknown values are dropped. */
export function parseRestaurantFilters(
  params: URLSearchParams,
): RestaurantFilters {
  return {
    categories: unique(
      params.getAll("category").filter((category) => category !== ""),
    ),
    openNow: params.get("openNow") === ON,
    delivery: params.get("delivery") === ON,
    pickup: params.get("pickup") === ON,
    official: params.get("official") === ON,
    sort: params.get("sort") === "rating" ? "rating" : "guide",
  };
}

/** The query string for `filters` (no leading `?`); defaults are left out. */
export function toRestaurantSearchParams(
  filters: RestaurantFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const category of unique(filters.categories)) {
    params.append("category", category);
  }
  if (filters.openNow) params.set("openNow", ON);
  if (filters.delivery) params.set("delivery", ON);
  if (filters.pickup) params.set("pickup", ON);
  if (filters.official) params.set("official", ON);
  if (filters.sort !== "guide") params.set("sort", filters.sort);
  return params;
}

/** Each Category of the Guide's Restaurants once, in first-seen order. */
export function categoriesOf(items: readonly GuideItem[]): string[] {
  return unique(items.flatMap((item) => item.restaurant?.categories ?? []));
}

/** Drops selected Categories that none of the Guide's Restaurants have (e.g. from an old link). */
export function withKnownCategories(
  filters: RestaurantFilters,
  known: readonly string[],
): RestaurantFilters {
  return {
    ...filters,
    categories: filters.categories.filter((category) =>
      known.includes(category),
    ),
  };
}

/** A filter on the Restaurant's details is on; while it is, Unavailable Restaurants are hidden. */
export function hasRestaurantFilter(filters: RestaurantFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.openNow ||
    filters.delivery ||
    filters.pickup ||
    filters.official
  );
}

/** Selects an unselected Category (at the end) or deselects a selected one. */
export function toggleCategory(
  categories: readonly string[],
  category: string,
): string[] {
  return categories.includes(category)
    ? categories.filter((selected) => selected !== category)
    : [...categories, category];
}

/** Every filter off; the sort stays. */
export function clearRestaurantFilters(
  filters: RestaurantFilters,
): RestaurantFilters {
  return { ...NO_RESTAURANT_FILTERS, sort: filters.sort };
}

/** A Guide Item to show, with its number in guide order (kept whatever the filters and sort). */
export interface PlacedGuideItem {
  item: GuideItem;
  position: number;
}

export interface OpenNowClock {
  now: Temporal.Instant;
  /** The Guide's `timeZone` (Thailand time). */
  timeZone: string;
}

function matches(
  restaurant: Restaurant,
  filters: RestaurantFilters,
  { now, timeZone }: OpenNowClock,
): boolean {
  return (
    (filters.categories.length === 0 ||
      restaurant.categories.some((category) =>
        filters.categories.includes(category),
      )) &&
    (!filters.delivery || restaurant.delivery) &&
    (!filters.pickup || restaurant.pickup) &&
    (!filters.official || restaurant.official) &&
    (!filters.openNow || isOpenNow(restaurant.workingHours, now, timeZone))
  );
}

/** Rated first, then Unrated Restaurants, then Unavailable ones. */
function ratingTier(item: GuideItem): number {
  if (!item.restaurant) return 2;
  return item.restaurant.numberOfReviews === 0 ? 1 : 0;
}

function byRating(a: PlacedGuideItem, b: PlacedGuideItem): number {
  const tier = ratingTier(a.item) - ratingTier(b.item);
  if (tier !== 0) return tier;
  // Array#sort is stable: equal Ratings keep guide order.
  return (b.item.restaurant?.rating ?? 0) - (a.item.restaurant?.rating ?? 0);
}

/**
 * The Guide Items to show, in display order. Categories match any one; Open Now, delivery,
 * pickup and official must all hold too. Unknown Categories are ignored. Unavailable Restaurants show
 * only while no Restaurant-based filter is on. Rating sort: best first, Unrated after the
 * rated, Unavailable last, ties in guide order.
 */
export function applyRestaurantFilters(
  items: readonly GuideItem[],
  filters: RestaurantFilters,
  clock: OpenNowClock,
): PlacedGuideItem[] {
  const active = withKnownCategories(filters, categoriesOf(items));
  const filtering = hasRestaurantFilter(active);
  const placed = items
    .map((item, index) => ({ item, position: index + 1 }))
    .filter(
      ({ item }) =>
        !filtering ||
        (item.restaurant !== null && matches(item.restaurant, active, clock)),
    );
  return active.sort === "rating" ? placed.sort(byRating) : placed;
}
