import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  cafeGuide,
  restaurantGuide,
} from "@/features/guide-index/lib/fixtures";
import { storyCover } from "@/features/guide-index/lib/storyImages";

import { GuideCard, type GuideCardGuide } from "./GuideCard";

const cafe: GuideCardGuide = {
  title: cafeGuide.title,
  count: cafeGuide.itemCount,
  description: cafeGuide.shortDescription,
  cover: storyCover("cover"),
  tags: cafeGuide.tags,
  href: `/guides/${cafeGuide.id}`,
};

const meta = {
  title: "Features/GuideIndex/GuideCard",
  component: GuideCard,
  tags: ["autodocs"],
  args: { guide: cafe, layout: "desktop", parentTestId: "guide-index" },
  decorators: [
    (Story, { args }) => (
      <div
        style={{ maxWidth: args.layout === "phone" ? "22.5rem" : "23.75rem" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GuideCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const Phone: Story = { args: { layout: "phone" } };

/** A long description is clamped to two lines; many Tags wrap. */
export const LongContent: Story = {
  args: {
    guide: {
      ...cafe,
      title: restaurantGuide.title,
      count: restaurantGuide.itemCount,
      description: restaurantGuide.shortDescription,
      tags: restaurantGuide.tags,
    },
  },
};

/** The first card loads its cover eagerly at high priority. */
export const Priority: Story = { args: { priority: true } };

/** No cover (or a broken one): a placeholder of the same 16:10 box. */
export const NoCover: Story = { args: { guide: { ...cafe, cover: [] } } };

export const NoTags: Story = { args: { guide: { ...cafe, tags: [] } } };
