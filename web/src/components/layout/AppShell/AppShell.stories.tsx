import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton, SkeletonGroup } from "@/components/common/Skeleton";
import {
  samplePageContent,
  sampleOverrides,
} from "@/test-utils/fixtures/sampleContent";

import { AppShell } from "./AppShell";

const meta = {
  title: "Components/Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    children: (
      <>
        <h1>{sampleOverrides.pageHeading}</h1>
        <p>{samplePageContent.body}</p>
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

/** The Guide page on a phone: the header gains a back link to the Guide Index. */
export const PhoneGuide: Story = {
  args: { guidePageTestId: "guide" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
