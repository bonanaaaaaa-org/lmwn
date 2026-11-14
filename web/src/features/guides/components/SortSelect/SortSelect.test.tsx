import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { m } from "@/paraglide/messages.js";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { SortSelect, type SortSelectProps } from "./SortSelect";

function renderSelect(props: Partial<SortSelectProps> = {}) {
  const onChange = vi.fn();
  renderWithProviders(
    <SortSelect
      value="guide"
      onChange={onChange}
      parentTestId="page/filters"
      {...props}
    />,
  );
  return { onChange };
}

const trigger = () => screen.getByTestId("page/filters/sort-select/trigger");

describe("SortSelect", () => {
  it("shows the label and the current sort on the trigger", () => {
    renderSelect({ value: "rating" });

    expect(screen.getByTestId("page/filters/sort-select")).toHaveTextContent(
      m.sortSelect_label(),
    );
    expect(trigger()).toHaveTextContent(m.sortSelect_rating_label());
    expect(trigger()).toHaveAccessibleName(
      `${m.sortSelect_rating_label()} ${m.sortSelect_label()}`,
    );
  });

  it("hides the label and names the trigger with the sort when the label is hidden", () => {
    renderSelect({ showLabel: false });

    expect(screen.queryByText(m.sortSelect_label())).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName(
      m.sortSelect_trigger_ariaLabel({
        value: m.sortSelect_guideOrder_label(),
      }),
    );
  });

  it("offers guide order and Rating, marking the current one", async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(trigger());

    const listbox = screen.getByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      m.sortSelect_guideOrder_label(),
      m.sortSelect_rating_label(),
    ]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onChange with the chosen sort", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect();

    await user.click(trigger());
    await user.click(
      screen.getByRole("option", { name: m.sortSelect_rating_label() }),
    );

    expect(onChange).toHaveBeenCalledWith("rating");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: "rating" });

    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowUp}{Enter}");

    expect(onChange).toHaveBeenCalledWith("guide");
  });
});
