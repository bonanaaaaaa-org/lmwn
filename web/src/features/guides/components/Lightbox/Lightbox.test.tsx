import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { photoAlt } from "@/features/guides/lib/photos";
import type { Photo } from "@/features/guides/lib/types";
import { m } from "@/paraglide/messages.js";
import { makePhoto, makeRestaurant } from "@/test-utils/fixtures/guides";

import { Lightbox } from "./Lightbox";

const NAME = makeRestaurant().name;
/** The strip's alt text for photo `n` of `total`, which the lightbox must match. */
const alt = (n: number, total = 4) => photoAlt(n, total, NAME);
/** The dialog's name: the Restaurant, then the photo counter. */
const title = (n: number, total = 4, name = NAME) =>
  `${name} ${m.lightbox_counter_body({ position: n, total })}`;

const fourPhotos = [1, 2, 3, 4].map((n) =>
  makePhoto(n, {
    smallUrl: `http://localhost:7777/r/480/854/${n}.jpg`,
    largeUrl: `http://localhost:7777/r/1080/1920/${n}.jpg`,
  }),
);

function OpenLightbox({
  photos = fourPhotos,
  initial = 0,
  name = NAME,
  onOpenChange,
}: {
  photos?: Photo[];
  initial?: number;
  name?: string;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [current, setCurrent] = useState(initial);
  const [isOpen, setOpen] = useState(true);
  return (
    <Lightbox
      name={name}
      photos={photos}
      current={current}
      onCurrentChange={setCurrent}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        onOpenChange?.(open);
      }}
      parentTestId="guide"
    />
  );
}

const shownPhoto = () =>
  within(screen.getByRole("dialog")).getAllByRole("img")[0];

describe("Lightbox", () => {
  it("is a modal dialog titled with the Restaurant and position, showing the large image", () => {
    render(<OpenLightbox initial={1} />);

    const dialog = screen.getByRole("dialog", {
      name: title(2),
    });
    expect(dialog).toHaveAttribute("data-testid", "guide/lightbox");
    const photo = within(dialog).getByRole("img", {
      name: alt(2),
    });
    expect(photo).toHaveAttribute(
      "src",
      "http://localhost:7777/r/1080/1920/2.jpg",
    );
    expect(photo).toHaveAttribute(
      "srcset",
      "http://localhost:7777/r/1080/1920/2.jpg 1080w",
    );
  });

  it("moves with the prev and next buttons, wrapping at either end", async () => {
    const user = userEvent.setup();
    render(<OpenLightbox initial={3} />);

    await user.click(screen.getByTestId("guide/lightbox/next"));
    expect(shownPhoto()).toHaveAccessibleName(alt(1));

    await user.click(screen.getByTestId("guide/lightbox/prev"));
    expect(shownPhoto()).toHaveAccessibleName(alt(4));
    expect(screen.getByTestId("guide/lightbox/prev")).toHaveAccessibleName(
      m.lightbox_prev_ariaLabel(),
    );
    expect(screen.getByTestId("guide/lightbox/next")).toHaveAccessibleName(
      m.lightbox_next_ariaLabel(),
    );
  });

  it("moves with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<OpenLightbox />);

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(shownPhoto()).toHaveAccessibleName(alt(3));
    await user.keyboard("{ArrowLeft}");
    expect(shownPhoto()).toHaveAccessibleName(alt(2));
  });

  it("moves with a horizontal touch swipe, but not a short or vertical one or a mouse drag", () => {
    render(<OpenLightbox />);
    const stage = screen.getByTestId("guide/lightbox/stage");
    const swipe = (
      pointerType: string,
      from: [number, number],
      to: [number, number],
    ) => {
      fireEvent.pointerDown(stage, {
        pointerType,
        isPrimary: true,
        clientX: from[0],
        clientY: from[1],
      });
      fireEvent.pointerUp(stage, {
        pointerType,
        isPrimary: true,
        clientX: to[0],
        clientY: to[1],
      });
    };

    swipe("touch", [300, 400], [100, 410]);
    expect(shownPhoto()).toHaveAccessibleName(alt(2));

    swipe("touch", [100, 400], [300, 390]);
    expect(shownPhoto()).toHaveAccessibleName(alt(1));

    swipe("touch", [300, 400], [280, 400]); // a tap
    swipe("touch", [300, 400], [200, 700]); // mostly vertical
    swipe("mouse", [300, 400], [100, 400]);
    expect(shownPhoto()).toHaveAccessibleName(alt(1));
  });

  it("jumps to a thumbnail, which marks the current photo", async () => {
    const user = userEvent.setup();
    render(<OpenLightbox />);

    const thumbs = within(
      screen.getByRole("list", { name: m.lightbox_thumbnails_ariaLabel() }),
    );
    expect(thumbs.getByRole("button", { name: alt(1) })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await user.click(thumbs.getByRole("button", { name: alt(3) }));
    expect(shownPhoto()).toHaveAccessibleName(alt(3));
    expect(thumbs.getByRole("button", { name: alt(3) })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("keeps Tab on the close, prev and next buttons, inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">outside</button>
        <OpenLightbox />
      </>,
    );

    const visited: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      await user.tab();
      visited.push(document.activeElement?.getAttribute("data-testid") ?? null);
    }
    expect(visited).toEqual([
      "guide/lightbox/close",
      "guide/lightbox/prev",
      "guide/lightbox/next",
      "guide/lightbox/close",
    ]);
  });

  it("closes with Esc and with the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = render(<OpenLightbox onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();

    render(<OpenLightbox onOpenChange={onOpenChange} />);
    expect(screen.getByTestId("guide/lightbox/close")).toHaveAccessibleName(
      m.lightbox_close_ariaLabel(),
    );
    await user.click(screen.getByTestId("guide/lightbox/close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no prev, next or thumbnails for a single photo", () => {
    render(<OpenLightbox photos={[fourPhotos[0] as Photo]} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName(title(1, 1));
    expect(screen.queryByTestId("guide/lightbox/prev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("guide/lightbox/next")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("falls back to a generic title and alt text for an Unavailable Restaurant", () => {
    render(
      <Lightbox
        photos={fourPhotos}
        current={0}
        onCurrentChange={() => {}}
        isOpen
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      title(1, 4, m.lightbox_title_unnamedLabel()),
    );
    expect(screen.getByTestId("lightbox")).toBeInTheDocument();
    expect(shownPhoto()).toHaveAccessibleName(photoAlt(1, 4));
  });

  it("leaves modified arrow keys to the browser", async () => {
    const user = userEvent.setup();
    render(<OpenLightbox />);

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(shownPhoto()).toHaveAccessibleName(alt(1));
  });

  it("shows the small image when the large URL is blank", () => {
    render(
      <OpenLightbox
        photos={[
          makePhoto(1, {
            smallUrl: "http://localhost:7777/r/480/854/1.jpg",
            largeUrl: "",
          }),
        ]}
      />,
    );
    expect(shownPhoto()).toHaveAttribute(
      "src",
      "http://localhost:7777/r/480/854/1.jpg",
    );
  });
});
