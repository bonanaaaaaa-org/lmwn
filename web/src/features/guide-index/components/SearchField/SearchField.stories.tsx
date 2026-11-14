import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

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
export const WithValue: Story = { args: { value: "คาเฟ่" } };

/** Focused: dark edge and the focus ring around the box. */
export const Focus: Story = {
  args: { value: "คาเฟ่" },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("searchbox"));
  },
};

/** Over 100 characters: 2px danger edge and the reason under the box. */
export const Invalid: Story = {
  args: {
    value: "ก".repeat(101),
    isInvalid: true,
    errorMessage: "คำค้นหายาวเกิน 100 ตัวอักษร",
  },
};

/** Typing, Enter and clearing call back with the text. */
export const Interactive: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("searchbox"), "คาเฟ่{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith("คาเฟ่");
    await userEvent.click(canvas.getByRole("button", { name: "ล้างคำค้นหา" }));
    await expect(args.onClear).toHaveBeenCalled();
    await expect(canvas.getByRole("searchbox")).toHaveValue("");
  },
};
