import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, userEvent, within } from "storybook/test";

import type { RestaurantSort } from "@/features/guides/lib/restaurantFilters";
import { m } from "@/paraglide/messages.js";

import { SortSelect } from "./SortSelect";

const meta = {
  title: "Features/Guides/SortSelect",
  component: SortSelect,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    value: "guide",
    showLabel: true,
    onChange: fn(),
    parentTestId: "guide/filters",
  },
  // Keeps the selection in state, so choosing an option updates the trigger.
  render: function Render(args) {
    const [value, setValue] = useState<RestaurantSort>(args.value);
    return (
      <SortSelect
        {...args}
        value={value}
        onChange={(sort) => {
          setValue(sort);
          args.onChange(sort);
        }}
      />
    );
  },
} satisfies Meta<typeof SortSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop: "sort by" label and a 200px trigger. */
export const Default: Story = {};

export const Rating: Story = { args: { value: "rating" } };

/** Phones: no label; the trigger is named "sort by: {value}". */
export const LabelHidden: Story = { args: { showLabel: false } };

const openOptions: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(
    within(canvasElement).getByTestId("guide/filters/sort-select/trigger"),
  );
  // The options open in a popover outside the story root.
  const selected = await screen.findByRole("option", { selected: true });
  await expect(selected).toBeVisible();
};

/** Open: the current option is tinted saffron with a check. */
export const Open: Story = {
  parameters: { layout: "padded" },
  play: openOptions,
};

export const OpenLabelHidden: Story = {
  args: { showLabel: false },
  parameters: { layout: "padded" },
  play: openOptions,
};

/** Choosing Rating closes the list and shows it on the trigger. */
export const ChooseRating: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByTestId(
      "guide/filters/sort-select/trigger",
    );
    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("option", { name: m.sortSelect_rating_label() }),
    );
    await expect(args.onChange).toHaveBeenCalledWith("rating");
    await expect(trigger).toHaveTextContent(m.sortSelect_rating_label());
  },
};
