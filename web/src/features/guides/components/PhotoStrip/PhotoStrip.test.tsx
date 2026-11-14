import { render, screen, within } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";
import { makePhoto } from "@/test-utils/fixtures/guides";

import { PhotoStrip } from "./PhotoStrip";

describe("PhotoStrip", () => {
  it("describes each photo by position and Restaurant, with srcset and lazy loading", () => {
    render(
      <PhotoStrip
        photos={[
          makePhoto(1, {
            smallUrl: "http://localhost:7777/r/480/854/a.jpg",
            largeUrl: "http://localhost:7777/r/1080/1920/a.jpg",
          }),
          makePhoto(2),
        ]}
        restaurantName="ONIBUS COFFEE"
        parentTestId="guide/restaurant-card"
      />,
    );

    const strip = screen.getByRole("list", {
      name: m.restaurantCard_photoStrip_ariaLabel({
        restaurant: "ONIBUS COFFEE",
      }),
    });
    const first = within(strip).getByRole("img", {
      name: m.restaurantCard_photoStrip_photo_alt({
        position: 1,
        total: 2,
        restaurant: "ONIBUS COFFEE",
      }),
    });
    expect(first).toHaveAttribute(
      "srcset",
      "http://localhost:7777/r/480/854/a.jpg 480w, http://localhost:7777/r/1080/1920/a.jpg 1080w",
    );
    expect(first).toHaveAttribute("loading", "lazy");
    expect(
      within(strip).getByRole("img", {
        name: m.restaurantCard_photoStrip_photo_alt({
          position: 2,
          total: 2,
          restaurant: "ONIBUS COFFEE",
        }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("guide/restaurant-card/photo-strip"),
    ).toContainElement(strip);
  });

  it("keeps a missing photo's box as a described placeholder", () => {
    const { container } = render(
      <PhotoStrip
        photos={[makePhoto(1, { smallUrl: "", largeUrl: "" })]}
        restaurantName="RISE"
      />,
    );
    expect(
      screen.getByRole("img", {
        name: m.restaurantCard_photoStrip_photo_alt({
          position: 1,
          total: 1,
          restaurant: "RISE",
        }),
      }),
    ).toHaveAttribute("data-state", "placeholder");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("offers a next button on desktop only when there are more than 3 photos", () => {
    const photos = [1, 2, 3, 4].map((n) => makePhoto(n));
    const { rerender } = render(
      <PhotoStrip photos={photos} parentTestId="card" />,
    );
    expect(screen.getByTestId("card/photo-strip/next")).toHaveAccessibleName(
      m.restaurantCard_photoStrip_next_ariaLabel(),
    );

    rerender(<PhotoStrip photos={photos.slice(0, 3)} parentTestId="card" />);
    expect(
      screen.queryByTestId("card/photo-strip/next"),
    ).not.toBeInTheDocument();

    rerender(<PhotoStrip photos={photos} layout="phone" parentTestId="card" />);
    expect(
      screen.queryByTestId("card/photo-strip/next"),
    ).not.toBeInTheDocument();
  });

  it("names photos without a Restaurant when it is unavailable", () => {
    render(<PhotoStrip photos={[makePhoto(1)]} />);
    expect(
      screen.getByRole("list", {
        name: m.restaurantCard_photoStrip_unnamedAriaLabel(),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: m.restaurantCard_photoStrip_photo_unnamedAlt({
          position: 1,
          total: 1,
        }),
      }),
    ).toBeInTheDocument();
  });

  it("shows every photo even when upstream repeats a photo ID", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <PhotoStrip
        photos={[makePhoto(1, { id: "same" }), makePhoto(2, { id: "same" })]}
        restaurantName="% Arabica"
      />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
