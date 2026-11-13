import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotFound } from "./NotFound";

const meta = {
  title: "Components/Common/NotFound",
  component: NotFound,
  tags: ["autodocs"],
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnknownPage: Story = {};
export const UnknownGuide: Story = {
  args: {
    title: "ไม่พบไกด์นี้",
    description: "ไกด์นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง",
  },
};
