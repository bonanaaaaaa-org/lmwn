import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { m } from "@/paraglide/messages.js";

import { Button, ButtonLink } from "./Button";

describe("Button", () => {
  it("calls onPress when activated by mouse or keyboard", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<Button onPress={onPress}>{m.errorPanel_retry_label()}</Button>);

    await user.click(
      screen.getByRole("button", { name: m.errorPanel_retry_label() }),
    );
    await user.keyboard("{Enter}");

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("does not fire while disabled", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <Button onPress={onPress} isDisabled>
        {m.errorPanel_retry_label()}
      </Button>,
    );

    await user.click(
      screen.getByRole("button", { name: m.errorPanel_retry_label() }),
    );

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("ButtonLink", () => {
  it("renders a real link", () => {
    render(<ButtonLink href="/">{m.notFound_backLink_label()}</ButtonLink>);

    expect(
      screen.getByRole("link", { name: m.notFound_backLink_label() }),
    ).toHaveAttribute("href", "/");
  });
});
