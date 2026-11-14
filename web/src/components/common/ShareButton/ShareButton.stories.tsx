import type { Meta, StoryObj } from "@storybook/react-vite";

import { ToastRegion } from "@/components/common/Toast";
import {
  guideItemShareTarget,
  guideShareTarget,
} from "@/features/guides/lib/share";
import { m } from "@/paraglide/messages.js";
import { makeGuide, makeGuideItem } from "@/test-utils/fixtures/guides";

import { ShareButton } from "./ShareButton";

const meta = {
  title: "Common/ShareButton",
  component: ShareButton,
  tags: ["autodocs"],
  args: {
    label: m.guideHeader_share_label(),
    variant: "primary",
    target: guideShareTarget(makeGuide()),
    testId: "guide/guide-header/share",
  },
  // Press it: the share sheet where the browser has one, else the copied-link toast.
  decorators: [
    (Story) => (
      <div style={{ minHeight: "10rem", padding: "1rem" }}>
        <Story />
        <ToastRegion parentTestId="app" />
      </div>
    ),
  ],
} satisfies Meta<typeof ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Guide header on desktop. */
export const Guide: Story = {};

/** A Restaurant card: a ghost icon button named after the Restaurant. */
export const RestaurantCard: Story = {
  args: {
    label: m.restaurantCard_share_ariaLabel({ restaurant: "ONIBUS COFFEE" }),
    variant: "ghost",
    iconOnly: true,
    testId: "guide/restaurant-card/share",
    target: guideItemShareTarget(makeGuide(), makeGuideItem()),
  },
};

/** The phone Guide header: a text-coloured icon button. */
export const PhoneHeader: Story = {
  args: { variant: "text", iconOnly: true },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
