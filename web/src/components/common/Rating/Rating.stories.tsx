import type { Meta, StoryObj } from "@storybook/react-vite";

import { Rating } from "./Rating";

const meta = {
  title: "Components/Common/Rating",
  component: Rating,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { rating: 4.29, reviews: 6 },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rated: Story = {};
export const Perfect: Story = { args: { rating: 5, reviews: 128 } };
/** An Unrated Restaurant: Rating 0 with 0 reviews means "unknown", not zero stars. */
export const Unrated: Story = { args: { rating: 0, reviews: 0 } };
