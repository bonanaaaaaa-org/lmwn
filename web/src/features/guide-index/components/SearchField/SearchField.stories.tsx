import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { MAX_SEARCH_LENGTH } from "@/features/guide-index/lib/filters";
import { m } from "@/paraglide/messages.js";
import { guideIndexSearches as q } from "@/test-utils/fixtures/guideIndex";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";

import { SearchField, type SearchFieldProps } from "./SearchField";

function Controlled(args: SearchFieldProps) {
  const [value, setValue] = useState(args.value);
  return (
    <SearchField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Features/GuideIndex/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  args: {
    value: "",
    onChange: fn(),
    onSubmit: fn(),
    onClear: fn(),
    parentTestId: "guide-index",
  },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "35rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** With text: the clear button appears. */
export const WithValue: Story = { args: { value: q.cafe } };

/** Focused: dark edge and the focus ring around the box. */
export const Focus: Story = {
  args: { value: q.cafe },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("searchbox"));
  },
};

/** Over 100 characters: 2px danger edge and the reason under the box. */
export const Invalid: Story = {
  args: {
    value: sampleThaiText.consonant.repeat(MAX_SEARCH_LENGTH + 1),
    isInvalid: true,
    errorMessage: m.guideIndex_search_tooLongMessage({
      max: MAX_SEARCH_LENGTH,
    }),
  },
};

/** Typing, Enter and clearing call back with the text. */
export const Interactive: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("searchbox"), `${q.cafe}{Enter}`);
    await expect(args.onSubmit).toHaveBeenCalledWith(q.cafe);
    await userEvent.click(
      canvas.getByRole("button", { name: m.searchField_clear_ariaLabel() }),
    );
    await expect(args.onClear).toHaveBeenCalled();
    await expect(canvas.getByRole("searchbox")).toHaveValue("");
  },
};
