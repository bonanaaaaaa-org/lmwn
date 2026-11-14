import type { Meta, StoryObj } from "@storybook/react-vite";

import { m } from "@/paraglide/messages.js";

import { NotFound } from "./NotFound";

const meta = {
  title: "Components/Common/NotFound",
  component: NotFound,
  tags: ["autodocs"],
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnknownPage: Story = {};
export const UnknownGuide: Story = {
  args: {
    title: m.guide_notFound_title(),
    description: m.guide_notFound_body(),
  },
};
