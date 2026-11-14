import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import type { ThemeChoice } from "@/lib/theme";
import { m } from "@/paraglide/messages.js";

import { ThemeToggle } from "./ThemeToggle";

const meta = {
  title: "Components/Layout/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  args: { value: "system", onChange: () => {}, parentTestId: "app/header" },
  // The switch here only reports the choice; the toolbar's theme sets the colours.
  render: function Render(args) {
    const [value, setValue] = useState<ThemeChoice>(args.value);
    return <ThemeToggle {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = {};
export const Light: Story = { args: { value: "light" } };
export const Dark: Story = { args: { value: "dark" } };

/** The menu open, from the keyboard (focus ring on the button, then the current option). */
export const MenuOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const body = within(canvasElement.ownerDocument.body);
    const menu = await body.findByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      canvas.getByRole("button", {
        name: m.themeToggle_ariaLabel({ theme: m.themeToggle_system_label() }),
      }),
    ).toHaveAttribute("aria-expanded", "true");
  },
};
