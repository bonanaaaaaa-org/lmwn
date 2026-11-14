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
