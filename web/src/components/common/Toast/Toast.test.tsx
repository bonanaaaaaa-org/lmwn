import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

import { ToastRegion } from "./Toast";
import { showToast, TOAST_TIMEOUT_MS, type ToastContent } from "./toastQueue";

function setup() {
  const queue = new ToastQueue<ToastContent>({ maxVisibleToasts: 1 });
  render(<ToastRegion queue={queue} parentTestId="app" />);
  return queue;
}

describe("ToastRegion", () => {
  it("renders nothing until a toast is shown", () => {
    setup();

    expect(screen.queryByTestId("app/toast")).not.toBeInTheDocument();
  });

  it("announces the message politely, with the app/toast test IDs", () => {
    const queue = setup();

    act(() => showToast({ message: "คัดลอกลิงก์แล้ว" }, queue));

    const toast = screen.getByTestId("app/toast");
    expect(screen.getByRole("region", { name: "การแจ้งเตือน" })).toContainElement(
      toast,
    );
    expect(toast).toHaveAttribute("role", "alertdialog");
    expect(toast).toHaveAccessibleName("คัดลอกลิงก์แล้ว");
    const status = within(toast).getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("คัดลอกลิงก์แล้ว");
    expect(screen.getByTestId("app/toast/close")).toHaveAccessibleName(
      "ปิดการแจ้งเตือน",
    );
    expect(toast).toHaveAttribute("data-tone", "success");
  });

  it("closes from its close button", async () => {
    const user = userEvent.setup();
    const queue = setup();
    act(() => showToast({ message: "คัดลอกลิงก์แล้ว" }, queue));

    await user.click(screen.getByTestId("app/toast/close"));

    expect(screen.queryByTestId("app/toast")).not.toBeInTheDocument();
  });

  it("replaces the toast on screen instead of stacking", () => {
    const queue = setup();

    act(() => {
      showToast({ message: "คัดลอกลิงก์แล้ว" }, queue);
      showToast({ message: "คัดลอกลิงก์ร้าน KFC แล้ว" }, queue);
    });

    expect(screen.getAllByTestId("app/toast")).toHaveLength(1);
    expect(screen.getByTestId("app/toast")).toHaveTextContent(
      "คัดลอกลิงก์ร้าน KFC แล้ว",
    );
  });

  it("goes away on its own", () => {
    vi.useFakeTimers();
    try {
      const queue = setup();
      act(() => showToast({ message: "คัดลอกลิงก์แล้ว" }, queue));

      act(() => vi.advanceTimersByTime(TOAST_TIMEOUT_MS));

      expect(screen.queryByTestId("app/toast")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks an error toast", () => {
    const queue = setup();

    act(() => showToast({ message: "คัดลอกลิงก์ไม่สำเร็จ", tone: "error" }, queue));

    expect(screen.getByTestId("app/toast")).toHaveAttribute(
      "data-tone",
      "error",
    );
  });
});
