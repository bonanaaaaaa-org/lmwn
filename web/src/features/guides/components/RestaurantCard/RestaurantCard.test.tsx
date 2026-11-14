import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { guideItemShareTarget } from "@/features/guides/lib/share";
import { m } from "@/paraglide/messages.js";
import {
  makeGuide,
  LONG_WRITE_UP,
  makeGuideItem,
  makeRestaurant,
} from "@/test-utils/fixtures/guides";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";

import { needsClamp, RestaurantCard } from "./RestaurantCard";

const share = guideItemShareTarget(makeGuide(), makeGuideItem());

const card = () => screen.getByTestId("guide/restaurant-card");
const restaurant = makeRestaurant();
/** "ONIBUS COFFEE" plus its branch, as the card names it. */
const fullName = `${restaurant.name} ${m.restaurantCard_branch_body({ branch: restaurant.branch ?? "" })}`;
const callLabel = m.restaurantCard_call_label({ phone: "093 916 4541" });

describe("RestaurantCard", () => {
  it("names the Restaurant with its branch, Rating, Categories and badges", () => {
    render(
      <RestaurantCard item={makeGuideItem()} index={1} parentTestId="guide" />,
    );

    expect(screen.getByRole("article", { name: fullName })).toHaveAttribute(
      "id",
      "item-c77c4d6c-01fa-4e62-8870-563de216a976",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      fullName,
    );
    expect(
      screen.getByRole("img", {
        name: m.rating_ariaLabel({ rating: "4.3", count: 6 }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(restaurant.categories.join(", ")),
    ).toBeInTheDocument();
    const badges = within(
      screen.getByRole("list", { name: m.restaurantCard_badges_ariaLabel() }),
    ).getAllByRole("listitem");
    expect(badges.map((badge) => badge.textContent)).toEqual([
      m.restaurantCard_badges_official_label(),
      m.restaurantCard_badges_delivery_label(),
      m.restaurantCard_badges_pickup_label(),
    ]);
  });

  it("shows no reviews and no branch for an Unrated Restaurant without one", () => {
    render(
      <RestaurantCard
        item={makeGuideItem({
          restaurant: makeRestaurant({
            branch: undefined,
            rating: 0,
            numberOfReviews: 0,
          }),
        })}
        index={2}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "ONIBUS COFFEE",
    );
    expect(screen.getByText(m.rating_unrated_label())).toBeInTheDocument();
  });

  it("links the address to Google Maps, the phone to a call and the Restaurant to Wongnai", () => {
    render(
      <RestaurantCard item={makeGuideItem()} index={1} parentTestId="guide" />,
    );

    expect(screen.getByText(restaurant.address)).toBeInTheDocument();
    expect(screen.getByTestId("guide/restaurant-card/map")).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=13.7275%2C100.5469",
    );
    expect(
      screen.getByRole("link", {
        name: `${m.restaurantCard_map_label()} ${m.restaurantCard_newTab_label()}`,
      }),
    ).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: callLabel })).toHaveAttribute(
      "href",
      "tel:0939164541",
    );
    expect(screen.getByTestId("guide/restaurant-card/wongnai")).toHaveAttribute(
      "href",
      "https://www.wongnai.com/restaurants/onibus-coffee-one-bangkok",
    );
    expect(screen.getByTestId("guide/restaurant-card/wongnai")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("shows LINE, Instagram and Facebook only when the Restaurant has them", () => {
    const { rerender } = render(
      <RestaurantCard item={makeGuideItem()} index={1} parentTestId="guide" />,
    );
    expect(screen.getByTestId("guide/restaurant-card/line")).toHaveAttribute(
      "href",
      "https://line.me/R/ti/p/%40onibuscoffee",
    );
    expect(
      screen.getByTestId("guide/restaurant-card/instagram"),
    ).toHaveAttribute("href", "https://www.instagram.com/onibuscoffee_bkk/");
    expect(
      screen.getByTestId("guide/restaurant-card/facebook"),
    ).toHaveAttribute("href", "https://www.facebook.com/onibuscoffeebkk");

    rerender(
      <RestaurantCard
        item={makeGuideItem({
          restaurant: makeRestaurant({
            line: undefined,
            instagram: "rise.bkk",
            facebook: undefined,
          }),
        })}
        index={1}
        parentTestId="guide"
      />,
    );
    expect(
      screen.queryByTestId("guide/restaurant-card/line"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("guide/restaurant-card/instagram"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("guide/restaurant-card/facebook"),
    ).not.toBeInTheDocument();
  });

  it("puts the call and Wongnai actions in the phone action grid", () => {
    render(
      <RestaurantCard
        item={makeGuideItem()}
        index={1}
        layout="phone"
        parentTestId="guide"
      />,
    );
    expect(screen.getByTestId("guide/restaurant-card/call")).toHaveTextContent(
      callLabel,
    );
    expect(
      screen.getByTestId("guide/restaurant-card/wongnai"),
    ).toHaveTextContent(m.restaurantCard_wongnai_shortLabel());
    expect(screen.getAllByTestId("guide/restaurant-card/call")).toHaveLength(1);
  });

  it("cuts a long write-up to about 4 lines until read more is pressed", async () => {
    const user = userEvent.setup();
    render(
      <RestaurantCard
        item={makeGuideItem({ description: LONG_WRITE_UP })}
        index={1}
        clamp
        parentTestId="guide"
      />,
    );
    const readMore = screen.getByRole("button", {
      name: m.restaurantCard_readMore_label(),
    });
    const writeUp = screen.getByText(LONG_WRITE_UP);
    expect(readMore).toHaveAttribute("aria-expanded", "false");
    expect(readMore).toHaveAttribute("aria-controls", writeUp.id);
    expect(writeUp).toHaveAttribute("data-clamped");

    await user.click(readMore);

    expect(
      screen.getByTestId("guide/restaurant-card/read-more"),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", {
        name: m.restaurantCard_readMore_expandedLabel(),
      }),
    ).toBeInTheDocument();
    expect(writeUp).not.toHaveAttribute("data-clamped");
  });

  it("shows a short write-up in full with no read-more", () => {
    render(<RestaurantCard item={makeGuideItem()} index={1} />);
    expect(
      screen.queryByRole("button", { name: m.restaurantCard_readMore_label() }),
    ).not.toBeInTheDocument();
  });

  it("keeps the write-up and photos of an Unavailable Restaurant and says it couldn't load", () => {
    render(
      <RestaurantCard
        item={makeGuideItem({
          description: sampleThaiText.writeUp,
          restaurant: null,
        })}
        index={3}
        parentTestId="guide"
      />,
    );
    expect(card()).toHaveAttribute("data-state", "unavailable");
    expect(
      screen.getByRole("article", {
        name: m.restaurantCard_unavailable_ariaLabel({ index: 3 }),
      }),
    ).toBe(card());
    expect(
      within(card()).getByText(m.restaurantCard_unavailable_body()),
    ).toBeInTheDocument();
    expect(
      within(card()).getByText(sampleThaiText.writeUp),
    ).toBeInTheDocument();
    expect(
      within(card()).getByRole("img", {
        name: m.restaurantCard_photoStrip_photo_unnamedAlt({
          position: 1,
          total: 4,
        }),
      }),
    ).toBeInTheDocument();
    expect(within(card()).queryByRole("heading")).not.toBeInTheDocument();
    expect(within(card()).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("RestaurantCard Wongnai link", () => {
  it("is left out when upstream sends a URL that isn't http(s)", () => {
    render(
      <RestaurantCard
        item={makeGuideItem({
          restaurant: makeRestaurant({ url: "javascript:alert(1)" }),
        })}
        index={1}
        parentTestId="guide"
      />,
    );
    expect(
      screen.queryByTestId("guide/restaurant-card/wongnai"),
    ).not.toBeInTheDocument();
  });
});

describe("needsClamp", () => {
  it("clamps long write-ups, sooner on a phone", () => {
    expect(needsClamp(sampleThaiText.short, "desktop")).toBe(false);
    expect(needsClamp(LONG_WRITE_UP, "phone")).toBe(true);
    expect(needsClamp(LONG_WRITE_UP, "desktop")).toBe(true);
    expect(needsClamp(sampleThaiText.consonant.repeat(200), "desktop")).toBe(
      false,
    );
    expect(needsClamp(sampleThaiText.consonant.repeat(200), "phone")).toBe(
      true,
    );
  });

  it("does not count Thai vowels and tone marks above or below the line", () => {
    expect(
      needsClamp(sampleThaiText.consonantWithMarks.repeat(100), "phone"),
    ).toBe(false);
  });

  it("offers a share button named after the Restaurant", () => {
    render(
      <RestaurantCard
        item={makeGuideItem()}
        index={1}
        share={share}
        parentTestId="guide"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: m.restaurantCard_share_ariaLabel({ restaurant: "ONIBUS COFFEE" }),
      }),
    ).toHaveAttribute("data-testid", "guide/restaurant-card/share");
  });

  it("has no share button for an Unavailable Restaurant", () => {
    render(
      <RestaurantCard
        item={makeGuideItem({ restaurant: null })}
        index={1}
        share={share}
        parentTestId="guide"
      />,
    );

    expect(
      screen.queryByTestId("guide/restaurant-card/share"),
    ).not.toBeInTheDocument();
  });

  it("marks the highlighted state on the card", () => {
    const { rerender } = render(
      <RestaurantCard item={makeGuideItem()} index={1} parentTestId="guide" />,
    );
    expect(card()).not.toHaveAttribute("data-highlighted");

    rerender(
      <RestaurantCard
        item={makeGuideItem()}
        index={1}
        highlighted
        parentTestId="guide"
      />,
    );

    expect(card()).toHaveAttribute("data-highlighted");
  });
});
