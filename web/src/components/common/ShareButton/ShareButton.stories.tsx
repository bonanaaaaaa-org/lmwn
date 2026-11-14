import type { Meta, StoryObj } from "@storybook/react-vite";

import { ToastRegion } from "@/components/common/Toast";

import { ShareButton } from "./ShareButton";

const meta = {
  title: "Common/ShareButton",
  component: ShareButton,
  tags: ["autodocs"],
  args: {
    label: "แชร์ไกด์",
    variant: "primary",
    target: {
      title: "10 คาเฟ่ลับ One Bangkok!",
      text: "ไม่อยากจะเชื่อ มีร้านคาเฟ่ดี ๆ แบบนี้ห้างดังย่านลุมพินี One Bangkok ด้วย",
      url: "/guides/e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb",
      copiedMessage: "คัดลอกลิงก์แล้ว",
    },
    testId: "guide/guide-header/share",
  },
  // Press it: the share sheet where the browser has one, else the copied-link toast.
  decorators: [
    (Story) => (
      <div style={{ minHeight: "10rem", padding: "1rem" }}>
        <Story />
        <ToastRegion parentTestId="app" />
      </div>
    ),
  ],
} satisfies Meta<typeof ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Guide header on desktop. */
export const Guide: Story = {};

/** A Restaurant card: a ghost icon button named after the Restaurant. */
export const RestaurantCard: Story = {
  args: {
    label: "แชร์ร้าน ONIBUS COFFEE",
    variant: "ghost",
    iconOnly: true,
    testId: "guide/restaurant-card/share",
    target: {
      title: "ONIBUS COFFEE (สาขา One Bangkok)",
      text: "ร้าน ONIBUS COFFEE (สาขา One Bangkok) จากไกด์ 10 คาเฟ่ลับ One Bangkok!",
      url: "/guides/e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb#item-c77c4d6c-01fa-4e62-8870-563de216a976",
      copiedMessage: "คัดลอกลิงก์ร้าน ONIBUS COFFEE แล้ว",
    },
  },
};

/** The phone Guide header: a text-coloured icon button. */
export const PhoneHeader: Story = {
  args: { variant: "text", iconOnly: true },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
