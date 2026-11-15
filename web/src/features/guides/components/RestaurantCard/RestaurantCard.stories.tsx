import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import {
  LONG_WRITE_UP,
  makeGuide,
  makeGuideItem,
  makePhoto,
  makeRestaurant,
} from "@/test-utils/fixtures/guides";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";
import {
  NO_RESTAURANT_FILTERS,
  restaurantFiltersHref,
  type RestaurantFilters,
} from "@/features/guides/lib/restaurantFilters";
import { guideItemShareTarget } from "@/features/guides/lib/share";
import { m } from "@/paraglide/messages.js";

import { RestaurantCard } from "./RestaurantCard";

const phone = { viewport: { value: "iphone14", isRotated: false } };

const meta = {
  title: "Features/Guides/RestaurantCard",
  component: RestaurantCard,
  tags: ["autodocs"],
  args: {
    item: makeGuideItem(),
    index: 1,
    layout: "desktop",
    share: guideItemShareTarget(makeGuide(), makeGuideItem()),
    parentTestId: "guide",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "70rem", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RestaurantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

/** Opened from a shared `#item-` link: a saffron ring that doesn't move the card. */
export const Highlighted: Story = { args: { highlighted: true } };

export const PhoneHighlighted: Story = {
  args: { layout: "phone", highlighted: true },
  globals: phone,
};

export const DesktopLongWriteUp: Story = {
  args: { item: makeGuideItem({ description: LONG_WRITE_UP }), clamp: true },
};

/** No branch, no social accounts, no reviews yet, no badges. */
export const UnratedWithoutExtras: Story = {
  args: {
    index: 4,
    item: makeGuideItem({
      photos: [makePhoto(1)],
      restaurant: makeRestaurant({
        name: "LMWN Cafe",
        branch: undefined,
        rating: 0,
        numberOfReviews: 0,
        official: false,
        delivery: false,
        pickup: false,
        line: undefined,
        instagram: undefined,
        facebook: undefined,
      }),
    }),
  },
};

/** The Restaurant couldn't be loaded: the write-up and photos stay. */
export const Unavailable: Story = {
  args: {
    index: 3,
    item: makeGuideItem({
      description: sampleThaiText.writeUp,
      photos: [
        makePhoto(1),
        makePhoto(2),
        makePhoto(3, { smallUrl: "", largeUrl: "" }),
      ],
      restaurant: null,
    }),
  },
};

export const MissingPhoto: Story = {
  args: {
    item: makeGuideItem({
      photos: [
        makePhoto(1),
        makePhoto(2, { smallUrl: "", largeUrl: "" }),
        makePhoto(3),
      ],
    }),
  },
};

export const Phone: Story = {
  args: { layout: "phone" },
  globals: phone,
  decorators: [
    (Story) => (
      <div style={{ paddingInline: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const PhoneClamped: Story = {
  ...Phone,
  args: {
    layout: "phone",
    clamp: true,
    item: makeGuideItem({ description: LONG_WRITE_UP }),
  },
};

export const PhoneUnavailable: Story = {
  ...Phone,
  args: { ...Unavailable.args, layout: "phone" },
};

const restaurant = makeRestaurant();
const [firstCategory, secondCategory] = restaurant.categories as [
  string,
  string,
];
const filtersHref = (filters: RestaurantFilters) =>
  restaurantFiltersHref("/guides/1", filters);

/** On the Guide page: each Category is a chip and each badge a link that filters the Guide. */
export const FilterLinks: Story = {
  args: { filters: NO_RESTAURANT_FILTERS, filtersHref },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole("link", {
      name: m.restaurantCard_filterLink_ariaLabel({ filter: firstCategory }),
    });
    await expect(chip).not.toHaveAttribute("aria-current");
    await expect(chip).toHaveAttribute(
      "href",
      filtersHref({ ...NO_RESTAURANT_FILTERS, categories: [firstCategory] }),
    );
    await expect(
      canvas.getByTestId("guide/restaurant-card/badge-official"),
    ).toHaveAttribute("href", "/guides/1?official=1");
  },
};

const someOn: RestaurantFilters = {
  ...NO_RESTAURANT_FILTERS,
  categories: [firstCategory],
  delivery: true,
};

/** A Category and a badge whose filters are on: selected, and pressing one turns it off. */
export const FilterLinksSelected: Story = {
  args: { filters: someOn, filtersHref },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selected = canvas.getByRole("link", {
      name: m.restaurantCard_filterLink_selectedAriaLabel({
        filter: firstCategory,
      }),
    });
    await expect(selected).toHaveAttribute("aria-current", "true");
    await expect(selected).toHaveAttribute("href", "/guides/1?delivery=1");
    await expect(
      canvas.getByRole("link", {
        name: m.restaurantCard_filterLink_ariaLabel({ filter: secondCategory }),
      }),
    ).not.toHaveAttribute("aria-current");
    await expect(
      canvas.getByTestId("guide/restaurant-card/badge-delivery"),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      canvas.getByTestId("guide/restaurant-card/badge-pickup"),
    ).not.toHaveAttribute("aria-current");
  },
};

export const PhoneFilterLinksSelected: Story = {
  ...Phone,
  args: { layout: "phone", filters: someOn, filtersHref },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByTestId("guide/restaurant-card/badge-delivery"),
    ).toHaveAttribute("aria-current", "true");
    for (const link of canvas.getAllByTestId(
      "guide/restaurant-card/category",
    )) {
      // Targets are at least 24×24 CSS px.
      const { width, height } = link.getBoundingClientRect();
      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(24);
    }
  },
};
