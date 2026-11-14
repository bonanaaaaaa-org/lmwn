import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("says the page is missing by default", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: m.notFound_title() }),
    ).toBeInTheDocument();
    expect(screen.getByText(m.notFound_body())).toBeInTheDocument();
  });

  it("names what is missing as the page heading", () => {
    render(<NotFound title={m.guide_notFound_title()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: m.guide_notFound_title(),
      }),
    ).toBeInTheDocument();
  });

  it("links back to the Guide Index", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: m.notFound_backLink_label() }),
    ).toHaveAttribute("href", "/");
  });

  it("puts its test ID under the parent and passes it to the back link", () => {
    render(<NotFound parentTestId="unknown" />);

    expect(screen.getByTestId("unknown/not-found")).toContainElement(
      screen.getByRole("heading", { level: 1 }),
    );
    expect(screen.getByTestId("unknown/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
  });
});
