import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  LONG_WRITE_UP,
  makeGuideItem,
  makePhoto,
  makeRestaurant,
} from "@/test-utils/fixtures/guides";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";

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
