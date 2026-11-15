import { describe, expect, it } from "vitest";

import {
  everyDay,
  makeGuideItem,
  makeRestaurant,
} from "@/test-utils/fixtures/guides";

import {
  applyRestaurantFilters,
  categoriesOf,
  clearRestaurantFilters,
  hasRestaurantFilter,
  NO_RESTAURANT_FILTERS,
  parseRestaurantFilters,
  toggleCategory,
  toRestaurantSearchParams,
  withKnownCategories,
  type RestaurantFilters,
} from "./restaurantFilters";
import type { GuideItem, Restaurant } from "./types";

const filters = (
  overrides: Partial<RestaurantFilters> = {},
): RestaurantFilters => ({ ...NO_RESTAURANT_FILTERS, ...overrides });

describe("restaurant filters in the URL", () => {
  it("reads no params as no filters and guide order", () => {
    expect(parseRestaurantFilters(new URLSearchParams())).toEqual({
      categories: [],
      openNow: false,
      delivery: false,
      pickup: false,
      sort: "guide",
    });
  });

  it("reads repeated categories, the toggles and the Rating sort", () => {
    expect(
      parseRestaurantFilters(
        new URLSearchParams(
          "category=Cafe&category=Bakery&openNow=1&delivery=1&pickup=1&sort=rating",
        ),
      ),
    ).toEqual({
      categories: ["Cafe", "Bakery"],
      openNow: true,
      delivery: true,
      pickup: true,
      sort: "rating",
    });
  });

  it("drops empty and repeated categories, and ignores values it doesn't know", () => {
    expect(
      parseRestaurantFilters(
        new URLSearchParams(
          "category=&category=Cafe&category=Cafe&openNow=yes&delivery=0&sort=price",
        ),
      ),
    ).toEqual(filters({ categories: ["Cafe"] }));
  });

  it("writes nothing for no filters and guide order", () => {
    expect(toRestaurantSearchParams(NO_RESTAURANT_FILTERS).toString()).toBe("");
  });

  it("writes one category param per Category, the toggles as 1 and a non-default sort", () => {
    expect(
      toRestaurantSearchParams({
        categories: ["Cafe", "Bakery/Cake"],
        openNow: true,
        delivery: true,
        pickup: true,
        sort: "rating",
      }).toString(),
    ).toBe(
      "category=Cafe&category=Bakery%2FCake&openNow=1&delivery=1&pickup=1&sort=rating",
    );
  });

  it("round-trips through the URL", () => {
    const state = filters({
      categories: ["Bakery", "Cafe"],
      pickup: true,
      sort: "rating",
    });
    expect(parseRestaurantFilters(toRestaurantSearchParams(state))).toEqual(
      state,
    );
  });
});

const BANGKOK = "Asia/Bangkok";

/** 2026-11-16 is a Monday. Bangkok is UTC+7 all year. */
const bangkok = (isoLocal: string) =>
  Temporal.Instant.from(`${isoLocal}+07:00`);
const NOON = bangkok("2026-11-16T12:00");

const item = (id: string, restaurant: Partial<Restaurant> | null): GuideItem =>
  makeGuideItem({
    id,
    restaurant:
      restaurant && makeRestaurant({ id: `r-${id}`, name: id, ...restaurant }),
  });

/** Open 08:00–17:00 every day unless a test says otherwise. */
const cafe = item("cafe", {
  categories: ["Cafe", "Bakery"],
  rating: 4.2,
  numberOfReviews: 6,
  delivery: true,
  pickup: true,
});
const noodles = item("noodles", {
  categories: ["Noodles"],
  rating: 4.8,
  numberOfReviews: 20,
  delivery: true,
  pickup: false,
  workingHours: everyDay(1080, 1560),
});
const unavailable = item("unavailable", null);
const unrated = item("unrated", {
  categories: ["Cafe"],
  rating: 0,
  numberOfReviews: 0,
  delivery: false,
  pickup: false,
});
const bakery = item("bakery", {
  categories: ["Bakery"],
  rating: 4.2,
  numberOfReviews: 3,
  delivery: false,
  pickup: true,
});
const ITEMS = [cafe, noodles, unavailable, unrated, bakery];

const apply = (
  overrides: Partial<RestaurantFilters>,
  now: Temporal.Instant = NOON,
  items: readonly GuideItem[] = ITEMS,
) =>
  applyRestaurantFilters(items, filters(overrides), { now, timeZone: BANGKOK });

const ids = (placed: ReturnType<typeof apply>) =>
  placed.map(({ item: shown }) => shown.id);

describe("categoriesOf", () => {
  it("lists each Category of the Guide's Restaurants once, in first-seen order", () => {
    expect(categoriesOf(ITEMS)).toEqual(["Cafe", "Bakery", "Noodles"]);
  });

  it("has none for a Guide of Unavailable Restaurants", () => {
    expect(categoriesOf([unavailable])).toEqual([]);
  });
});

describe("applyRestaurantFilters", () => {
  it("shows every Guide Item in guide order, numbered from 1, with no filters", () => {
    expect(apply({})).toEqual(
      ITEMS.map((shown, index) => ({ item: shown, position: index + 1 })),
    );
  });

  it("keeps Restaurants with any selected Category", () => {
    expect(ids(apply({ categories: ["Noodles", "Bakery"] }))).toEqual([
      "cafe",
      "noodles",
      "bakery",
    ]);
  });

  it("keeps each card's guide-order position", () => {
    expect(
      apply({ categories: ["Bakery"] }).map(({ position }) => position),
    ).toEqual([1, 5]);
  });

  it("keeps delivery Restaurants", () => {
    expect(ids(apply({ delivery: true }))).toEqual(["cafe", "noodles"]);
  });

  it("keeps pickup Restaurants", () => {
    expect(ids(apply({ pickup: true }))).toEqual(["cafe", "bakery"]);
  });

  it("keeps Restaurants that are Open Now in Thailand time", () => {
    expect(ids(apply({ openNow: true }))).toEqual([
      "cafe",
      "unrated",
      "bakery",
    ]);
    // 01:00 on Tuesday: only the late-night Monday 18:00–02:00 range is open.
    expect(ids(apply({ openNow: true }, bangkok("2026-11-17T01:00")))).toEqual([
      "noodles",
    ]);
  });

  it("judges Open Now by the Guide's time zone, not the instant's UTC clock", () => {
    // 02:00 UTC is 09:00 in Bangkok: the day-time Restaurants are open.
    expect(
      ids(
        apply({ openNow: true }, Temporal.Instant.from("2026-11-16T02:00:00Z")),
      ),
    ).toEqual(["cafe", "unrated", "bakery"]);
  });

  it("needs every toggle and a selected Category together", () => {
    expect(
      ids(
        apply({
          categories: ["Cafe", "Noodles"],
          delivery: true,
          openNow: true,
        }),
      ),
    ).toEqual(["cafe"]);
    expect(ids(apply({ delivery: true, pickup: true }))).toEqual(["cafe"]);
  });

  it("can match nothing", () => {
    expect(apply({ categories: ["Noodles"], pickup: true })).toEqual([]);
  });

  it("hides Unavailable Restaurants only while a Restaurant-based filter is on", () => {
    expect(ids(apply({}))).toContain("unavailable");
    expect(ids(apply({ sort: "rating" }))).toContain("unavailable");
    expect(ids(apply({ categories: ["Cafe"] }))).not.toContain("unavailable");
    expect(ids(apply({ openNow: true }))).not.toContain("unavailable");
  });

  it("ignores Categories none of the Guide's Restaurants have", () => {
    expect(ids(apply({ categories: ["Pizza"] }))).toEqual(ids(apply({})));
    expect(ids(apply({ categories: ["Pizza", "Noodles"] }))).toEqual([
      "noodles",
    ]);
  });

  describe("sorted by Rating", () => {
    it("puts the best rated first, Unrated after the rated, then Unavailable", () => {
      expect(ids(apply({ sort: "rating" }))).toEqual([
        "noodles",
        "cafe",
        "bakery",
        "unrated",
        "unavailable",
      ]);
    });

    it("keeps guide order between equal Ratings and keeps the guide-order numbers", () => {
      const placed = apply({ sort: "rating", pickup: true });
      expect(ids(placed)).toEqual(["cafe", "bakery"]);
      expect(placed.map(({ position }) => position)).toEqual([1, 5]);
    });

    it("keeps several Unrated and Unavailable Restaurants in guide order", () => {
      const unrated2 = item("unrated-2", { rating: 0, numberOfReviews: 0 });
      const unavailable2 = item("unavailable-2", null);
      expect(
        ids(
          apply({ sort: "rating" }, NOON, [
            unavailable2,
            unrated2,
            unavailable,
            unrated,
            cafe,
          ]),
        ),
      ).toEqual([
        "cafe",
        "unrated-2",
        "unrated",
        "unavailable-2",
        "unavailable",
      ]);
    });
  });
});

describe("hasRestaurantFilter", () => {
  it("is off with no filters, whatever the sort", () => {
    expect(hasRestaurantFilter(NO_RESTAURANT_FILTERS)).toBe(false);
    expect(hasRestaurantFilter(filters({ sort: "rating" }))).toBe(false);
  });

  it.each<Partial<RestaurantFilters>>([
    { categories: ["Cafe"] },
    { openNow: true },
    { delivery: true },
    { pickup: true },
  ])("is on for %o", (overrides) => {
    expect(hasRestaurantFilter(filters(overrides))).toBe(true);
  });
});

describe("withKnownCategories", () => {
  it("drops selected Categories the Guide doesn't have, keeping the rest", () => {
    expect(
      withKnownCategories(
        filters({ categories: ["Pizza", "Cafe"], pickup: true }),
        ["Cafe", "Bakery"],
      ),
    ).toEqual(filters({ categories: ["Cafe"], pickup: true }));
  });
});

describe("toggleCategory", () => {
  it("adds an unselected Category at the end and removes a selected one", () => {
    expect(toggleCategory(["Cafe"], "Bakery")).toEqual(["Cafe", "Bakery"]);
    expect(toggleCategory(["Cafe", "Bakery"], "Cafe")).toEqual(["Bakery"]);
  });
});

describe("clearRestaurantFilters", () => {
  it("turns every filter off but keeps the sort", () => {
    expect(
      clearRestaurantFilters({
        categories: ["Cafe"],
        openNow: true,
        delivery: true,
        pickup: true,
        sort: "rating",
      }),
    ).toEqual(filters({ sort: "rating" }));
  });
});
