import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { setThemeChoice, THEME_STORAGE_KEY } from "@/lib/theme";

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

  it.each(["desktop", "phone-index", "phone-guide"] as const)(
    "switches the theme from the %s header, and saves it",
    async (layout) => {
      const user = userEvent.setup();
      render(<Header parentTestId="app" layout={layout} />);
      await user.click(screen.getByTestId("app/header/theme-toggle/trigger"));
      await user.click(
        screen.getByRole("menuitemradio", { name: m.themeToggle_dark_label() }),
      );
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(
        screen.getByRole("button", {
          name: m.themeToggle_ariaLabel({ theme: m.themeToggle_dark_label() }),
        }),
      ).toBeInTheDocument();
      setThemeChoice("system");
    },
  );
});
