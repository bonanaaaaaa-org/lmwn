import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { m } from "@/paraglide/messages.js";
import { makePhoto } from "@/test-utils/fixtures/guides";

import { PhotoStrip } from "./PhotoStrip";

const meta = {
  title: "Features/Guides/PhotoStrip",
  component: PhotoStrip,
  tags: ["autodocs"],
  args: {
    photos: [1, 2, 3, 4, 5].map((n) => makePhoto(n)),
    restaurantName: "ONIBUS COFFEE",
    layout: "desktop",
    parentTestId: "guide/restaurant-card",
    lightboxParentTestId: "guide",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "62rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three in view, a next button for the rest. */
export const Desktop: Story = {};
export const DesktopThreePhotos: Story = {
  args: { photos: [1, 2, 3].map((n) => makePhoto(n)) },
};
/** About 1.2 photos in view; the next one peeks in. */
export const Phone: Story = {
  args: { layout: "phone" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
/** A missing photo keeps its box as a placeholder. */
export const MissingPhoto: Story = {
  args: {
    photos: [
      makePhoto(1),
      makePhoto(2, { smallUrl: "", largeUrl: "" }),
      makePhoto(3),
    ],
  },
};
export const SinglePhoto: Story = { args: { photos: [makePhoto(1)] } };

/** Each photo is a button: pressing one opens the lightbox on it. */
export const OpensLightbox: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      canvas.getByRole("button", {
        name: m.restaurantCard_photoStrip_photo_alt({
          position: 2,
          total: 5,
          restaurant: "ONIBUS COFFEE",
        }),
      }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole("dialog", {
        name: `ONIBUS COFFEE ${m.lightbox_counter_body({ position: 2, total: 5 })}`,
      }),
    ).toBeInTheDocument();
  },
};
