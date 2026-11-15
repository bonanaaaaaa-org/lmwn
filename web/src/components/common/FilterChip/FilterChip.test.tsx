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

  it("shows as pressed with a check when selected", () => {
    renderChip({ selected: true });

    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(icon()).toBe("check");
  });

  it("shows the clock only while unselected", () => {
    renderChip({ icon: "clock" });
    expect(icon()).toBe("clock");
  });

  it("drops the clock for the check once selected", () => {
    renderChip({ icon: "clock", selected: true });
    expect(icon()).toBe("check");
  });

  it("shows the badge check only while unselected", () => {
    renderChip({ icon: "badge-check" });
    expect(icon()).toBe("badge-check");
  });

  it("drops the badge check for the check once selected", () => {
    renderChip({ icon: "badge-check", selected: true });
    expect(icon()).toBe("check");
  });

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
