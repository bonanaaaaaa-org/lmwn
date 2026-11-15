import type { Meta, StoryObj } from "@storybook/react-vite";

import { ICON_NAMES, Icon, type IconTone } from "./Icon";

const TONES: IconTone[] = ["muted", "accent", "accent-text", "danger-inverse"];

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

/** Each tone; `danger-inverse` is for dark surfaces, so the row sits on one. */
export const Tones: Story = {
  render: (args) => (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        padding: "1rem",
        borderRadius: "1rem",
        background: "var(--color-surface-inverse)",
      }}
    >
      {TONES.map((tone) => (
        <Icon key={tone} {...args} tone={tone} />
      ))}
    </div>
  ),
};

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
