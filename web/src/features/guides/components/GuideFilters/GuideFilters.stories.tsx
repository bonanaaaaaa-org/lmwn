import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import {
  NO_RESTAURANT_FILTERS,
  type RestaurantFilters,
} from "@/features/guides/lib/restaurantFilters";
import { m } from "@/paraglide/messages.js";
import { sampleCategories as c } from "@/test-utils/fixtures/guides";

import { GuideFilters } from "./GuideFilters";

const phone = { viewport: { value: "iphone14", isRotated: false } };

const meta = {
  title: "Features/Guides/GuideFilters",
  component: GuideFilters,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    categories: [c.coffee, c.bakery, c.fastFood],
    filters: NO_RESTAURANT_FILTERS,
    shown: 4,
    total: 4,
    onChange: fn(),
    layout: "desktop",
    parentTestId: "guide",
  },
  // Keeps the filters in state, so chips and the sort respond.
  render: function Render(args) {
    const [filters, setFilters] = useState<RestaurantFilters>(args.filters);
    return (
      <GuideFilters
        {...args}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof GuideFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop: a card with the Category title, a divider before the toggles and the labelled sort. */
export const Default: Story = {};

export const Selected: Story = {
  args: {
    filters: {
      ...NO_RESTAURANT_FILTERS,
      categories: [c.coffee],
      openNow: true,
      sort: "rating",
    },
    shown: 1,
  },
};

/** Phones: one row that scrolls sideways, Open Now first; the sort hides its label. */
export const Phone: Story = {
  globals: phone,
  args: { layout: "phone" },
};

export const PhoneSelected: Story = {
  globals: phone,
  args: { ...Selected.args, layout: "phone" },
};

export const NoMatches: Story = {
  args: {
    filters: {
      ...NO_RESTAURANT_FILTERS,
      categories: [c.fastFood],
      pickup: true,
    },
    shown: 0,
  },
};

/** Official on: only Restaurants with the Official badge are counted. */
export const OfficialSelected: Story = {
  args: {
    filters: { ...NO_RESTAURANT_FILTERS, official: true },
    shown: 2,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const official = canvas.getByTestId("guide/filters/official");
    await expect(official).toHaveTextContent(m.guideFilters_official_label());
    await expect(official).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(official);
    await expect(official).toHaveAttribute("aria-pressed", "false");
    await expect(args.onChange).toHaveBeenLastCalledWith(NO_RESTAURANT_FILTERS);
  },
};

export const PhoneOfficialSelected: Story = {
  globals: phone,
  args: { ...OfficialSelected.args, layout: "phone" },
};

/** A Guide whose Restaurants have no Categories (or are all Unavailable): toggles only. */
export const NoCategories: Story = { args: { categories: [] } };

/** Pressing a chip selects it; pressing again clears it. */
export const ToggleChips: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const bakery = canvas.getByRole("button", { name: c.bakery });
    await userEvent.click(bakery);
    await expect(bakery).toHaveAttribute("aria-pressed", "true");
    await expect(args.onChange).toHaveBeenLastCalledWith({
      ...NO_RESTAURANT_FILTERS,
      categories: [c.bakery],
    });
    const delivery = canvas.getByRole("button", {
      name: m.guideFilters_delivery_label(),
    });
    await userEvent.click(delivery);
    await expect(delivery).toHaveAttribute("aria-pressed", "true");
  },
};
