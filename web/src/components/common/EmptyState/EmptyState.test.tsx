import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("explains the empty result under a heading", () => {
    render(<EmptyState title="ไกด์นี้ยังไม่มีร้าน" description="ลองดูไกด์อื่น" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "ไกด์นี้ยังไม่มีร้าน" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ลองดูไกด์อื่น")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a button action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        title="ไม่พบ"
        actionLabel="ล้างตัวกรอง"
        onAction={onAction}
        parentTestId="guide"
      />,
    );
    await user.click(screen.getByTestId("guide/empty-state/action"));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("guide/empty-state")).toBeInTheDocument();
  });

  it("offers a link action", () => {
    render(<EmptyState title="ไม่พบ" actionLabel="ดูไกด์ทั้งหมด" actionHref="/" />);
    expect(screen.getByRole("link", { name: "ดูไกด์ทั้งหมด" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
