import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("shows its label; the official badge check is decorative", () => {
    const { container } = render(
      <Badge variant="official">
        {m.restaurantCard_badges_official_label()}
      </Badge>,
    );
    expect(
      screen.getByText(m.restaurantCard_badges_official_label()),
    ).toBeInTheDocument();
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("data-icon", "badge-check");
  });

  it("has no icon when neutral", () => {
    const { container } = render(
      <Badge>{m.restaurantCard_badges_delivery_label()}</Badge>,
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
