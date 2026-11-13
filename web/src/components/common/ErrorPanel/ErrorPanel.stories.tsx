import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ErrorPanel } from "./ErrorPanel";

const meta = {
  title: "Components/Common/ErrorPanel",
  component: ErrorPanel,
  tags: ["autodocs"],
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Retrying: Story = { args: { isRetrying: true } };
export const Inline: Story = {
  args: {
    variant: "inline",
    title: "ค้นหาไม่สำเร็จ",
    description: "ยังแสดงผลลัพธ์ก่อนหน้าอยู่",
  },
};
export const WithoutRetry: Story = { args: { onRetry: undefined } };
export const LongContent: Story = {
  args: {
    title: "โหลดไกด์ไม่สำเร็จ เนื่องจากเซิร์ฟเวอร์ไม่ตอบสนองภายในเวลาที่กำหนด",
    description:
      "ระบบลองเชื่อมต่อใหม่ให้อัตโนมัติแล้ว 2 ครั้งแต่ยังไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ แล้วกดลองใหม่อีกครั้ง",
  },
};
