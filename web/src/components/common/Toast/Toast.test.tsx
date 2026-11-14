import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

import { m } from "@/paraglide/messages.js";

import { ToastRegion } from "./Toast";
import { showToast, TOAST_TIMEOUT_MS, type ToastContent } from "./toastQueue";

const copied = () => m.guideHeader_share_copiedBody();
const copiedKfc = () =>
  m.restaurantCard_share_copiedBody({ restaurant: "KFC" });

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

    act(() => showToast({ message: copied() }, queue));

    const toast = screen.getByTestId("app/toast");
    expect(
      screen.getByRole("region", { name: m.toast_region_ariaLabel() }),
    ).toContainElement(toast);
    expect(toast).toHaveAttribute("role", "alertdialog");
    expect(toast).toHaveAccessibleName(copied());
    const status = within(toast).getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(copied());
    expect(screen.getByTestId("app/toast/close")).toHaveAccessibleName(
      m.toast_close_ariaLabel(),
    );
    expect(toast).toHaveAttribute("data-tone", "success");
  });

  it("closes from its close button", async () => {
    const user = userEvent.setup();
    const queue = setup();
    act(() => showToast({ message: copied() }, queue));

    await user.click(screen.getByTestId("app/toast/close"));

    expect(screen.queryByTestId("app/toast")).not.toBeInTheDocument();
  });

  it("replaces the toast on screen instead of stacking", () => {
    const queue = setup();

    act(() => {
      showToast({ message: copied() }, queue);
      showToast({ message: copiedKfc() }, queue);
    });

    expect(screen.getAllByTestId("app/toast")).toHaveLength(1);
    expect(screen.getByTestId("app/toast")).toHaveTextContent(copiedKfc());
  });

  it("goes away on its own", () => {
    vi.useFakeTimers();
    try {
      const queue = setup();
      act(() => showToast({ message: copied() }, queue));

      act(() => vi.advanceTimersByTime(TOAST_TIMEOUT_MS));

      expect(screen.queryByTestId("app/toast")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks an error toast", () => {
    const queue = setup();

    act(() =>
      showToast(
        { message: m.shareButton_copyFailed_body(), tone: "error" },
        queue,
      ),
    );

    expect(screen.getByTestId("app/toast")).toHaveAttribute(
      "data-tone",
      "error",
    );
  });
});
