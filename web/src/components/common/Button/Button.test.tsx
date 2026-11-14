import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button, ButtonLink } from "./Button";

describe("Button", () => {
  it("calls onPress when activated by mouse or keyboard", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<Button onPress={onPress}>ลองใหม่</Button>);

    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));
    await user.keyboard("{Enter}");

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("does not fire while disabled", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <Button onPress={onPress} isDisabled>
        ลองใหม่
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("ButtonLink", () => {
  it("renders a real link", () => {
    render(<ButtonLink href="/">กลับไปหน้าไกด์ทั้งหมด</ButtonLink>);

    expect(
      screen.getByRole("link", { name: "กลับไปหน้าไกด์ทั้งหมด" }),
    ).toHaveAttribute("href", "/");
  });
});
