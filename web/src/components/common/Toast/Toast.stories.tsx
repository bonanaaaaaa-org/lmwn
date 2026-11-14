import type { Meta, StoryObj } from "@storybook/react-vite";
import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

import { Button } from "@/components/common/Button";
import { m } from "@/paraglide/messages.js";

import { ToastRegion } from "./Toast";
import { showToast, type ToastContent } from "./toastQueue";

/** A queue holding one toast that stays until closed, so the sheet can show it. */
function queueWith(content: ToastContent) {
  const queue = new ToastQueue<ToastContent>({ maxVisibleToasts: 1 });
  queue.add(content);
  return queue;
}

const meta = {
  title: "Common/Toast",
  component: ToastRegion,
  tags: ["autodocs"],
  args: {
    parentTestId: "app",
    queue: queueWith({ message: m.guideHeader_share_copiedBody() }),
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ minHeight: "14rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToastRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Guide link was copied (no Web Share API). */
export const LinkCopied: Story = {};

/** A card's link was copied: the message names the Restaurant. */
export const RestaurantLinkCopied: Story = {
  args: {
    queue: queueWith({
      message: m.restaurantCard_share_copiedBody({
        restaurant: "ONIBUS COFFEE",
      }),
    }),
  },
};

export const CopyFailed: Story = {
  args: {
    queue: queueWith({
      message: m.shareButton_copyFailed_body(),
      tone: "error",
    }),
  },
};

export const Phone: Story = {
  args: {
    queue: queueWith({
      message: m.restaurantCard_share_copiedBody({
        restaurant: "BLUE COFFEE - URBAN COLLECTIONS",
      }),
    }),
  },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};

const liveQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 1 });

/** Press repeatedly: one toast at a time, replaced each press, gone after 4 seconds. */
export const Interactive: Story = {
  args: { queue: liveQueue },
  render: (args) => (
    <div style={{ padding: "1rem" }}>
      <Button
        onPress={() =>
          showToast({ message: m.guideHeader_share_copiedBody() }, liveQueue)
        }
      >
        Show toast
      </Button>
      <ToastRegion {...args} />
    </div>
  ),
};
