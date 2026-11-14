import { render, screen } from "@testing-library/react";

import { Rating } from "./Rating";

describe("Rating", () => {
  it("is read out as the score out of 5 with the review count", () => {
    render(<Rating rating={4.29} reviews={6} />);
    expect(
      screen.getByRole("img", { name: "4.3 จาก 5 ดาว, 6 รีวิว" }),
    ).toHaveTextContent("4.3· 6 รีวิว");
  });

  it("says ยังไม่มีรีวิว for an Unrated Restaurant instead of stars", () => {
    render(<Rating rating={0} reviews={0} />);
    expect(screen.getByText("ยังไม่มีรีวิว")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
