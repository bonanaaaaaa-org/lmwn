import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/Common/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    title: "ไม่พบไกด์ที่ตรงกับ “ราเมน”",
    description: "ลองใช้คำที่สั้นลง หรือเอาแท็ก #คาเฟ่ ออกเพื่อดูไกด์ทั้งหมด",
    actionLabel: "ล้างการค้นหา",
    onAction: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A Guide with no Guide Items yet. */
export const EmptyGuide: Story = {
  args: {
    title: "ไกด์นี้ยังไม่มีร้าน",
    description: "บรรณาธิการกำลังคัดร้านอยู่ ลองดูไกด์อื่นไปก่อน",
    actionLabel: "ดูไกด์ทั้งหมด",
    actionHref: "/",
    onAction: undefined,
  },
};

/** No restaurant matches the filters (the Guide page). */
export const NoFilterMatch: Story = {
  args: {
    icon: false,
    meta: "0 จาก 10 ร้าน",
    title: "ไม่มีร้านที่เปิดอยู่และรับเองที่ร้านได้",
    description: undefined,
    actionLabel: "ล้างตัวกรอง",
    actionVariant: "primary",
  },
};

export const WithoutAction: Story = { args: { actionLabel: undefined } };
