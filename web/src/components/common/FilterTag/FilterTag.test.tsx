import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { m } from "@/paraglide/messages.js";
import { guideIndexTags as t } from "@/test-utils/fixtures/guideIndex";

import { FilterTagGroup } from "./FilterTag";

function renderGroup(
  props: Partial<React.ComponentProps<typeof FilterTagGroup>> = {},
) {
  const onSelectionChange = vi.fn();
  render(
    <FilterTagGroup
      aria-label={m.guideIndex_tagFilter_title()}
      tags={[t.coffee, t.cafe, t.restaurant]}
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
    renderGroup({ selectedTags: [t.cafe] });

    const tags = screen.getAllByTestId("page/tag-filter/tag");
    expect(tags.map((tag) => tag.textContent)).toEqual([
      `#${t.coffee}`,
      `#${t.cafe}`,
      `#${t.restaurant}`,
    ]);
    expect(screen.getByRole("row", { name: `#${t.cafe}` })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("row", { name: `#${t.coffee}` })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("adds a pressed Tag to the selection, keeping the existing order", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({ selectedTags: [t.restaurant] });

    await user.click(screen.getByRole("row", { name: `#${t.coffee}` }));

    expect(onSelectionChange).toHaveBeenCalledWith([t.restaurant, t.coffee]);
  });

  it("removes a selected Tag when pressed again", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({
      selectedTags: [t.coffee, t.cafe],
    });

    await user.click(screen.getByRole("row", { name: `#${t.coffee}` }));

    expect(onSelectionChange).toHaveBeenCalledWith([t.cafe]);
  });

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup();

    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(onSelectionChange).toHaveBeenCalledWith([t.cafe]);
  });

  it("ignores disabled Tags", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = renderGroup({ disabledTags: [t.coffee] });

    await user.click(screen.getByRole("row", { name: `#${t.coffee}` }));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
