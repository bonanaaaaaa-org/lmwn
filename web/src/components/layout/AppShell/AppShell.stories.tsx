import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton, SkeletonGroup } from "@/components/common/Skeleton";

import { AppShell } from "./AppShell";

const meta = {
  title: "Components/Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    children: (
      <>
        <h1>ไกด์ทั้งหมด</h1>
        <p>เนื้อหาของหน้าแสดงตรงนี้</p>
      </>
    ),
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    children: (
      <SkeletonGroup>
        <div style={{ display: "grid", gap: "1rem" }}>
          <Skeleton width="50%" height="2rem" />
          <Skeleton shape="text" lines={3} />
        </div>
      </SkeletonGroup>
    ),
  },
};
