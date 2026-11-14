import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { m } from "@/paraglide/messages.js";
import { guideIndexTags as t } from "@/test-utils/fixtures/guideIndex";
import { sampleTags } from "@/test-utils/fixtures/sampleContent";

import { FilterTagGroup } from "./FilterTag";

const TAGS = [t.coffee, t.cafe, t.restaurant, t.bangkok, t.one, t.bangkokLatin];

const meta = {
  title: "Components/Common/FilterTag",
  component: FilterTagGroup,
  tags: ["autodocs"],
  args: {
    "aria-label": m.guideIndex_tagFilter_title(),
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
  args: { selectedTags: [t.restaurant, t.coffee] },
};

export const Disabled: Story = {
  args: { disabledTags: [t.one, t.bangkokLatin] },
};

/** Phones: a single row that scrolls sideways. */
export const ScrollRow: Story = {
  args: { layout: "scroll", selectedTags: [t.restaurant] },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22rem", paddingInline: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const LongTag: Story = {
  args: { tags: [sampleTags.long, t.cafe] },
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
    await expect(args.onSelectionChange).toHaveBeenCalledWith([t.cafe]);
    await expect(
      canvas.getByRole("row", { name: `#${t.cafe}` }),
    ).toHaveAttribute("aria-selected", "true");
  },
};
