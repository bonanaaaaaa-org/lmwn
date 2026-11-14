import type { Meta, StoryObj } from "@storybook/react-vite";

import { sampleImageAlts } from "@/test-utils/fixtures/sampleContent";

import { ResponsiveImage } from "./ResponsiveImage";

// Inline SVG data URLs keep stories off the network (and off the image server).
const svg = (width: number, height: number, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#d9c7b5"/><text x="50%" y="50%" font-family="sans-serif" font-size="${width / 12}" text-anchor="middle" dominant-baseline="middle" fill="#1f1a15">${label}</text></svg>`,
  )}`;

const meta = {
  title: "Components/Common/ResponsiveImage",
  component: ResponsiveImage,
  tags: ["autodocs"],
  args: {
    alt: sampleImageAlts.hiddenCafeInOneBangkok,
    aspectRatio: "16 / 9",
    sizes: "(min-width: 48rem) 36rem, 100vw",
    sources: [
      { url: svg(480, 270, "small 480w"), width: 480 },
      { url: svg(1200, 675, "large 1200w"), width: 1200 },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "36rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResponsiveImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Square: Story = { args: { aspectRatio: "1 / 1" } };
export const Priority: Story = { args: { priority: true } };

/** No URL from the gateway: a placeholder of the same size. */
export const Empty: Story = { args: { sources: [] } };

/** The image fails to decode (like the image server's empty 200 body). */
export const Broken: Story = {
  args: {
    sources: [{ url: "data:image/png;base64,", width: 480 }],
  },
};
