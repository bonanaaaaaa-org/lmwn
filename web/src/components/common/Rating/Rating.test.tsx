import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { Rating } from "./Rating";

describe("Rating", () => {
  it("is read out as the score out of 5 with the review count", () => {
    render(<Rating rating={4.29} reviews={6} />);
    expect(
      screen.getByRole("img", {
        name: m.rating_ariaLabel({ rating: "4.3", count: 6 }),
      }),
    ).toHaveTextContent(`4.3· ${m.rating_reviews_body({ count: 6 })}`);
  });

  it("shows the score to one decimal place", () => {
    render(<Rating rating={4} reviews={1234} />);
    expect(screen.getByText("4.0")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      m.rating_ariaLabel({ rating: "4.0", count: 1234 }),
    );
  });

  it("says it has no reviews for an Unrated Restaurant instead of stars", () => {
    render(<Rating rating={0} reviews={0} />);
    expect(screen.getByText(m.rating_unrated_label())).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
