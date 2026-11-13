import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ErrorPanel } from "./ErrorPanel";

describe("ErrorPanel", () => {
  it("is announced as an alert with its title", () => {
    render(<ErrorPanel title="โหลดไกด์ไม่สำเร็จ" />);

    expect(screen.getByRole("alert")).toHaveTextContent("โหลดไกด์ไม่สำเร็จ");
    expect(
      screen.getByRole("heading", { level: 2, name: "โหลดไกด์ไม่สำเร็จ" }),
    ).toBeInTheDocument();
  });

  it("calls onRetry when the diner presses ลองใหม่", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorPanel onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ignores repeat presses while a retry is in flight", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorPanel onRetry={onRetry} isRetrying />);

    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("has no retry button when there is nothing to retry", () => {
    render(<ErrorPanel />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
