import type { Meta, StoryObj } from "@storybook/react-vite";

import { ICON_NAMES, Icon } from "./Icon";

const meta = {
  title: "Components/Common/Icon",
  component: Icon,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { name: "share", size: 24 },
  argTypes: { name: { control: "select", options: ICON_NAMES } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every icon on the 24 grid. */
export const Sheet: Story = {
  render: (args) => (
    <ul
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 6rem)",
        gap: "1rem",
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {ICON_NAMES.map((name) => (
        <li
          key={name}
          style={{
            display: "grid",
            justifyItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
          }}
        >
          <Icon {...args} name={name} />
          {name}
        </li>
      ))}
    </ul>
  ),
};
