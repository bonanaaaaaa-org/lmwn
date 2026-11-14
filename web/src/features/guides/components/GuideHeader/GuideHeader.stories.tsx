import type { Meta, StoryObj } from "@storybook/react-vite";

import { Header, HeaderSlotProvider } from "@/components/layout/Header";
import { guideShareTarget } from "@/features/guides/lib/share";
import { makeGuide } from "@/test-utils/fixtures/guides";
import { stressCopy } from "@/test-utils/fixtures/sampleContent";

import { GuideHeader } from "./GuideHeader";

const meta = {
  title: "Features/Guides/GuideHeader",
  component: GuideHeader,
  tags: ["autodocs"],
  args: {
    guide: makeGuide(),
    layout: "desktop",
    share: guideShareTarget(makeGuide()),
    parentTestId: "guide",
  },
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
/** On a phone the share button sits in the app header, at the right of the bar. */
export const PhoneWithAppHeader: Story = {
  args: { layout: "phone" },
  globals: { viewport: { value: "iphone14", isRotated: false } },
  decorators: [
    (Story) => (
      <HeaderSlotProvider>
        <Header layout="phone-guide" parentTestId="app" />
        <Story />
      </HeaderSlotProvider>
    ),
  ],
};
export const WithoutShare: Story = { args: { share: undefined } };
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
