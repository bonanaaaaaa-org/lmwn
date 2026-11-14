import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { FilterTagGroup } from "./FilterTag";

const TAGS = ["กาแฟ", "คาเฟ่", "ร้านอาหาร", "กรุงเทพ", "One", "Bangkok"];

const meta = {
  title: "Components/Common/FilterTag",
  component: FilterTagGroup,
  tags: ["autodocs"],
  args: {
    "aria-label": "กรองตามแท็ก",
    tags: TAGS,
    selectedTags: [],
    onSelectionChange: fn(),
    tagTestId: "guide-index/tag-filter/tag",
  },
} satisfies Meta<typeof FilterTagGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Selected: saffron fill, weight 600 and a trailing check. */
export const Selected: Story = {
  args: { selectedTags: ["ร้านอาหาร", "กาแฟ"] },
};

export const Disabled: Story = {
  args: { disabledTags: ["One", "Bangkok"] },
};

/** Phones: a single row that scrolls sideways. */
export const ScrollRow: Story = {
  args: { layout: "scroll", selectedTags: ["ร้านอาหาร"] },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22rem", paddingInline: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const LongTag: Story = {
  args: { tags: ["ร้านอาหารสำหรับกลุ่มใหญ่ที่จองล่วงหน้าได้", "คาเฟ่"] },
};

/** Keyboard: Tab into the group, arrows move, Enter toggles. Shows the focus ring. */
export const Interactive: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <FilterTagGroup
        {...args}
        selectedTags={selected}
        onSelectionChange={(tags) => {
          setSelected(tags);
          args.onSelectionChange(tags);
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await expect(args.onSelectionChange).toHaveBeenCalledWith(["คาเฟ่"]);
    await expect(canvas.getByRole("row", { name: "#คาเฟ่" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};
