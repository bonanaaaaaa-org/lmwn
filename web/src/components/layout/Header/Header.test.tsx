import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { Header } from "./Header";

describe("Header", () => {
  it("links the brand to the Guide Index", () => {
    render(<Header parentTestId="app" />);
    expect(screen.getByTestId("app/header")).toBe(screen.getByRole("banner"));
    expect(
      screen.getByRole("link", { name: m.header_logo_label() }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByTestId("app/header/logo")).toHaveAttribute("href", "/");
  });

  it("adds a labelled back link in the phone Guide layout", () => {
    render(
      <Header
        parentTestId="app"
        layout="phone-guide"
        backLinkTestId="guide/back-link"
      />,
    );
    const back = screen.getByRole("link", {
      name: m.header_backLink_ariaLabel(),
    });
    expect(back).toHaveAttribute("href", "/");
    expect(back).toBe(screen.getByTestId("guide/back-link"));
    expect(screen.getByTestId("app/header/logo")).toBeInTheDocument();
  });
});
