import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleButtonGroup } from "react-aria-components";

import { m } from "@/paraglide/messages.js";

import { FilterChip, type FilterChipProps } from "./FilterChip";

function renderChip(props: Partial<FilterChipProps> = {}) {
  const onSelectionChange = vi.fn();
  render(
    <ToggleButtonGroup
      selectionMode="multiple"
      selectedKeys={props.selected ? ["open-now"] : []}
      onSelectionChange={(keys) => onSelectionChange([...keys])}
    >
      <FilterChip
        id="open-now"
        label={m.guideFilters_openNow_label()}
        testId="page/filters/open-now"
        {...props}
      />
    </ToggleButtonGroup>,
  );
  return { onSelectionChange };
}

const chip = () =>
  screen.getByRole("button", { name: m.guideFilters_openNow_label() });

/** The leading icon shown, if any. */
const icon = () =>
  chip().querySelector("[data-icon]")?.getAttribute("data-icon") ?? null;

describe("FilterChip", () => {
  it("is a toggle button with its label and test ID, and no icon by default", () => {
    renderChip();

    expect(chip()).toHaveAttribute("aria-pressed", "false");
    expect(icon()).toBeNull();
    expect(chip()).toHaveAttribute("data-testid", "page/filters/open-now");
  });

  it("shows as pressed with no check when selected", () => {
    renderChip({ selected: true });

    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(icon()).toBeNull();
  });

  it.each([
    ["clock", false],
    ["clock", true],
    ["badge-check", false],
    ["badge-check", true],
  ] as const)(
    "keeps its %s icon whether selected or not (selected: %s)",
    (leading, selected) => {
      renderChip({ icon: leading, selected });
      expect(icon()).toBe(leading);
    },
  );

  it("asks the group to toggle it when pressed", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderChip();

    await user.click(chip());

    expect(onSelectionChange).toHaveBeenCalledWith(["open-now"]);
  });

  it("ignores presses while disabled", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderChip({ isDisabled: true });

    await user.click(chip());

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
