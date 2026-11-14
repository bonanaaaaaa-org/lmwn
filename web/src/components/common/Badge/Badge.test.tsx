import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("shows its label; the official check is decorative", () => {
    const { container } = render(<Badge variant="official">Official</Badge>);
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has no icon when neutral", () => {
    const { container } = render(
      <Badge>{m.restaurantCard_badges_delivery_label()}</Badge>,
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
