import type { Meta, StoryObj } from "@storybook/react-vite";

import { sampleTags } from "@/test-utils/fixtures/sampleContent";

import { TagLink } from "./TagLink";

const meta = {
  title: "Components/Common/TagLink",
  component: TagLink,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { tag: sampleTags.cafe },
} satisfies Meta<typeof TagLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** The 32px grey chip used in the Guide header. */
export const Filled: Story = { args: { variant: "filled" } };
/** A filter chip (no "#") whose filter is on: saffron fill and weight 600, with no check. */
export const Selected: Story = {
  args: { variant: "filled", hash: false, isSelected: true },
};
/** A badge as a filter link, e.g. Official on a Restaurant card. */
export const WithIcon: Story = {
  args: {
    variant: "filled",
    hash: false,
    icon: "badge-check",
    tag: "Official",
  },
};
/** The Official badge with its filter on: the badge check stays, with no trailing check. */
export const WithIconSelected: Story = {
  args: { ...WithIcon.args, isSelected: true },
};
export const Latin: Story = { args: { tag: sampleTags.latin } };
export const LongTag: Story = {
  args: { tag: sampleTags.long },
};

/** Tags wrap onto new lines on narrow screens. */
export const Group: Story = {
  render: () => (
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        listStyle: "none",
        margin: 0,
        padding: 0,
        maxWidth: "20rem",
      }}
    >
      {[
        sampleTags.cafe,
        sampleTags.latin,
        sampleTags.matcha,
        sampleTags.hiddenGem,
        sampleTags.travel,
      ].map((tag) => (
        <li key={tag}>
          <TagLink tag={tag} />
        </li>
      ))}
    </ul>
  ),
};
