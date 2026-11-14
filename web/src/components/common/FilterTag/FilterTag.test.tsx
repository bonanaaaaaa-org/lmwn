import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterTagGroup } from "./FilterTag";

function renderGroup(
  props: Partial<React.ComponentProps<typeof FilterTagGroup>> = {},
) {
  const onSelectionChange = vi.fn();
  render(
    <FilterTagGroup
      aria-label="กรองตามแท็ก"
      tags={["กาแฟ", "คาเฟ่", "ร้านอาหาร"]}
      selectedTags={[]}
      onSelectionChange={onSelectionChange}
      tagTestId="page/tag-filter/tag"
      {...props}
    />,
  );
  return { onSelectionChange };
}

describe("FilterTagGroup", () => {
  it("offers each Tag with a # and marks the selected ones", () => {
    renderGroup({ selectedTags: ["คาเฟ่"] });

    const tags = screen.getAllByTestId("page/tag-filter/tag");
    expect(tags.map((tag) => tag.textContent)).toEqual([
      "#กาแฟ",
      "#คาเฟ่",
      "#ร้านอาหาร",
    ]);
    expect(screen.getByRole("row", { name: "#คาเฟ่" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("row", { name: "#กาแฟ" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("adds a pressed Tag to the selection, keeping the existing order", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({ selectedTags: ["ร้านอาหาร"] });

    await user.click(screen.getByRole("row", { name: "#กาแฟ" }));

    expect(onSelectionChange).toHaveBeenCalledWith(["ร้านอาหาร", "กาแฟ"]);
  });

  it("removes a selected Tag when pressed again", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({
      selectedTags: ["กาแฟ", "คาเฟ่"],
    });

    await user.click(screen.getByRole("row", { name: "#กาแฟ" }));

    expect(onSelectionChange).toHaveBeenCalledWith(["คาเฟ่"]);
  });

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup();

    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(onSelectionChange).toHaveBeenCalledWith(["คาเฟ่"]);
  });

  it("ignores disabled Tags", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({ disabledTags: ["กาแฟ"] });

    await user.click(screen.getByRole("row", { name: "#กาแฟ" }));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
