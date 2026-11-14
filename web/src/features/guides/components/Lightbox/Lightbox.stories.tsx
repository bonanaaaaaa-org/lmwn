import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { m } from "@/paraglide/messages.js";
import { makePhoto, makeRestaurant } from "@/test-utils/fixtures/guides";

import { Lightbox, type LightboxProps } from "./Lightbox";

/** Keeps `current` and `isOpen` in story state, so the controls work as they do in the app. */
function StatefulLightbox(props: LightboxProps) {
  const [current, setCurrent] = useState(props.current);
  const [isOpen, setOpen] = useState(props.isOpen);
  return (
    <Lightbox
      {...props}
      current={current}
      onCurrentChange={(index) => {
        setCurrent(index);
        props.onCurrentChange(index);
      }}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        props.onOpenChange(open);
      }}
    />
  );
}

const meta = {
  title: "Features/Guides/Lightbox",
  component: Lightbox,
  tags: ["autodocs"],
  // Each story is an open modal: render them in separate iframes on the docs page, so they
  // don't hide one another from assistive tech or fight over focus.
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "40rem" } },
  },
  args: {
    name: makeRestaurant().name,
    photos: [1, 2, 3, 4].map((n) => makePhoto(n)),
    current: 1,
    isOpen: true,
    onCurrentChange: fn(),
    onOpenChange: fn(),
    parentTestId: "guide",
  },
  // Re-seed the story's state when Controls change `current` or `isOpen`.
  render: (args) => (
    <StatefulLightbox key={`${args.current}:${args.isOpen}`} {...args} />
  ),
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Prev and next flank the photo; the current thumbnail is outlined. */
export const Desktop: Story = {};

/** Full screen; prev and next sit either side of the thumbnails. Swipe to move. */
export const Phone: Story = {
  globals: { viewport: { value: "iphone14", isRotated: false } },
};

/** The arrow keys and the next button move between photos, wrapping at the end. */
export const MovesBetweenPhotos: Story = {
  args: { current: 2 },
  play: async ({ canvasElement, args }) => {
    // The dialog is portalled to the document body, outside the story root.
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog");
    await userEvent.keyboard("{ArrowRight}");
    await expect(dialog).toHaveAccessibleName(
      `${makeRestaurant().name} ${m.lightbox_counter_body({ position: 4, total: 4 })}`,
    );
    await userEvent.click(body.getByTestId("guide/lightbox/next"));
    await expect(dialog).toHaveAccessibleName(
      `${makeRestaurant().name} ${m.lightbox_counter_body({ position: 1, total: 4 })}`,
    );
    await expect(args.onCurrentChange).toHaveBeenLastCalledWith(0);
  },
};

export const SinglePhoto: Story = {
  args: { photos: [makePhoto(1)], current: 0 },
};

/** A missing photo keeps its frame as a placeholder. */
export const MissingPhoto: Story = {
  args: {
    photos: [makePhoto(1), makePhoto(2, { smallUrl: "", largeUrl: "" })],
  },
};

/** An Unavailable Restaurant has no name, so the title and alt text leave it out. */
export const UnavailableRestaurant: Story = {
  args: { name: undefined },
};

/** Eight photos, the most a Guide Item has: the thumbnails scroll on a phone. */
export const EightPhotos: Story = {
  args: { photos: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => makePhoto(n)) },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
