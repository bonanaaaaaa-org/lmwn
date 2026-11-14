import type { Meta, StoryObj } from "@storybook/react-vite";

import { makeGuide } from "@/test-utils/fixtures/guides";
import { stressCopy } from "@/test-utils/fixtures/sampleContent";

import { GuideHeader } from "./GuideHeader";

const meta = {
  title: "Features/Guides/GuideHeader",
  component: GuideHeader,
  tags: ["autodocs"],
  args: { guide: makeGuide(), layout: "desktop", parentTestId: "guide" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "70rem", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GuideHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
export const Phone: Story = {
  args: { layout: "phone" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
};
export const MissingCover: Story = {
  args: {
    guide: makeGuide({ coverPhoto: { id: "c", smallUrl: "", largeUrl: "" } }),
  },
};
export const LongTitle: Story = {
  args: {
    guide: makeGuide({
      title: stressCopy.guideTitle,
    }),
  },
};
