import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Icon } from "@/components/common/Icon";
import { m } from "@/paraglide/messages.js";

import { Button, ButtonLink } from "./Button";

const meta = {
  title: "Components/Common/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { onPress: fn(), children: m.errorPanel_retry_label() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Inverse: Story = { args: { variant: "inverse" } };
export const Text: Story = {
  args: { variant: "text", children: m.restaurantCard_readMore_label() },
};
/** Round and translucent, for dark surfaces such as the lightbox. */
export const Overlay: Story = {
  args: {
    variant: "overlay",
    "aria-label": m.lightbox_next_ariaLabel(),
    children: <Icon name="chevron-right" size={20} strokeWidth={2.2} />,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "1.5rem",
          borderRadius: "1rem",
          background: "var(--color-surface-inverse)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export const Compact: Story = { args: { variant: "ghost", size: "compact" } };
export const Disabled: Story = { args: { isDisabled: true } };
export const Pending: Story = { args: { isPending: true } };

export const AsLink: Story = {
  render: () => <ButtonLink href="/">{m.notFound_backLink_label()}</ButtonLink>,
};

/** The phone call action: an ink-filled link with an icon. */
export const InverseLink: Story = {
  render: () => (
    <ButtonLink href="tel:0939164541" variant="inverse">
      <Icon name="phone" size={18} />
      {m.restaurantCard_call_label({ phone: "093 916 4541" })}
    </ButtonLink>
  ),
};

export const GhostCompactLink: Story = {
  render: () => (
    <ButtonLink
      href="https://www.instagram.com/"
      variant="ghost"
      size="compact"
    >
      <Icon name="instagram" size={16} />
      Instagram
    </ButtonLink>
  ),
};

export const SecondaryLink: Story = {
  render: () => (
    <ButtonLink href="/" variant="secondary">
      {m.notFound_backLink_label()}
    </ButtonLink>
  ),
};
