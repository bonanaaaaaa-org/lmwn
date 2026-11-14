import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ToggleButtonGroup } from "react-aria-components";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { m } from "@/paraglide/messages.js";

import { FilterChip } from "./FilterChip";

const meta = {
  title: "Components/Common/FilterChip",
  component: FilterChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    label: m.guideFilters_delivery_label(),
    selected: false,
    icon: "none",
    onChange: fn(),
    testId: "guide/filters/delivery",
  },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Hovered: Story = {
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button");
    await userEvent.hover(chip);
    // React Aria sets data-hovered on the next render, which can land after hover() resolves.
    await waitFor(() => expect(chip).toHaveAttribute("data-hovered"));
  },
};

/** Keyboard focus shows the 3px ink ring. */
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button");
    await userEvent.tab();
    await expect(chip).toHaveAttribute("data-focus-visible");
  },
};

/** Selected: saffron fill, weight 600 and a leading check. */
export const Selected: Story = { args: { selected: true } };

export const SelectedHovered: Story = {
  args: { selected: true },
  play: Hovered.play,
};

export const Disabled: Story = { args: { isDisabled: true } };

/** Open Now carries a clock while unselected. */
export const Clock: Story = {
  args: {
    label: m.guideFilters_openNow_label(),
    icon: "clock",
    testId: "guide/filters/open-now",
  },
};

/** Selected, the check replaces the clock. */
export const ClockSelected: Story = {
  args: { ...Clock.args, selected: true },
};

/** In a ToggleButtonGroup, as the Guide page uses it: arrows move, Space toggles. */
export const InGroup: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<string[]>(["delivery"]);
    return (
      <ToggleButtonGroup
        aria-label={m.guideFilters_group_ariaLabel()}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={(keys) => setSelected([...keys].map(String))}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <FilterChip
          id="open-now"
          label={m.guideFilters_openNow_label()}
          icon="clock"
          selected={selected.includes("open-now")}
          onChange={args.onChange}
        />
        <FilterChip
          id="delivery"
          label={m.guideFilters_delivery_label()}
          selected={selected.includes("delivery")}
        />
        <FilterChip
          id="pickup"
          label={m.guideFilters_pickup_label()}
          selected={selected.includes("pickup")}
        />
      </ToggleButtonGroup>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openNow = canvas.getByRole("button", {
      name: m.guideFilters_openNow_label(),
    });
    await userEvent.click(openNow);
    await expect(openNow).toHaveAttribute("aria-pressed", "true");
  },
};
