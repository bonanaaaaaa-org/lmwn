import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button, ButtonLink } from "./Button";

const meta = {
  title: "Components/Common/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { onPress: fn(), children: "ลองใหม่" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Disabled: Story = { args: { isDisabled: true } };
export const Pending: Story = { args: { isPending: true } };

export const AsLink: Story = {
  render: () => <ButtonLink href="/">กลับไปหน้าไกด์ทั้งหมด</ButtonLink>,
};

export const SecondaryLink: Story = {
  render: () => (
    <ButtonLink href="/" variant="secondary">
      กลับไปหน้าไกด์ทั้งหมด
    </ButtonLink>
  ),
};
