import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { m } from "@/paraglide/messages.js";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("names the icon button after the current theme", () => {
    renderWithProviders(
      <ThemeToggle
        value="dark"
        onChange={() => {}}
        parentTestId="app/header"
      />,
    );
    const button = screen.getByRole("button", {
      name: m.themeToggle_ariaLabel({ theme: m.themeToggle_dark_label() }),
    });
    expect(button).toBe(screen.getByTestId("app/header/theme-toggle/trigger"));
    expect(screen.getByTestId("app/header/theme-toggle")).toContainElement(
      button,
    );
    expect(button).toHaveTextContent("");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("offers system, light and dark, with the current one checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <ThemeToggle
        value="system"
        onChange={onChange}
        parentTestId="app/header"
      />,
    );
    await user.click(screen.getByTestId("app/header/theme-toggle/trigger"));
    // React Aria names the menu after its trigger.
    const menu = screen.getByRole("menu", {
      name: m.themeToggle_ariaLabel({ theme: m.themeToggle_system_label() }),
    });
    expect(menu).toBe(screen.getByTestId("app/header/theme-toggle/menu"));
    const items = screen.getAllByRole("menuitemradio");
    expect(screen.getAllByTestId("app/header/theme-toggle/option")).toEqual(
      items,
    );
    expect(items.map((item) => item.textContent)).toEqual([
      m.themeToggle_system_label(),
      m.themeToggle_light_label(),
      m.themeToggle_dark_label(),
    ]);
    expect(items[0]).toHaveAttribute("aria-checked", "true");

    await user.click(
      screen.getByRole("menuitemradio", { name: m.themeToggle_dark_label() }),
    );
    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <ThemeToggle
        value="system"
        onChange={onChange}
        parentTestId="app/header"
      />,
    );
    await user.tab();
    expect(screen.getByTestId("app/header/theme-toggle/trigger")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("light");
  });
});
