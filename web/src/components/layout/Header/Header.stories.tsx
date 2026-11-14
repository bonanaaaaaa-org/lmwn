import type { Meta, StoryObj } from "@storybook/react-vite";

import { Header } from "./Header";

const meta = {
  title: "Components/Layout/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { parentTestId: "app", homeHref: "/" },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { args: { layout: "desktop" } };
export const PhoneIndex: Story = {
  args: { layout: "phone-index" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
/** The Guide page on a phone: back to the Guide Index, then the brand. */
export const PhoneGuide: Story = {
  args: { layout: "phone-guide", backLinkTestId: "guide/back-link" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
