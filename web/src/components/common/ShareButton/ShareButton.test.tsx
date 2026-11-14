import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastRegion, toastQueue } from "@/components/common/Toast";
import type { ShareTarget } from "@/hooks/useShare";

import { ShareButton } from "./ShareButton";

const target: ShareTarget = {
  title: "ONIBUS COFFEE",
  text: "ร้าน ONIBUS COFFEE จากไกด์ 10 คาเฟ่ลับ One Bangkok!",
  url: "/guides/g1#item-i1",
  copiedMessage: "คัดลอกลิงก์ร้าน ONIBUS COFFEE แล้ว",
};

afterEach(() => {
  act(() => {
    for (const toast of toastQueue.visibleToasts) toastQueue.close(toast.key);
  });
});

describe("ShareButton", () => {
  it("shows its label with the share icon", () => {
    render(<ShareButton target={target} label="แชร์ไกด์" testId="x/share" />);

    const button = screen.getByRole("button", { name: "แชร์ไกด์" });
    expect(button).toHaveTextContent("แชร์ไกด์");
    expect(button).toHaveAttribute("data-testid", "x/share");
    expect(button).not.toHaveAttribute("data-icon-only");
  });

  it("is a named icon-only button with iconOnly", () => {
    render(
      <ShareButton target={target} label="แชร์ร้าน ONIBUS COFFEE" iconOnly />,
    );

    const button = screen.getByRole("button", {
      name: "แชร์ร้าน ONIBUS COFFEE",
    });
    expect(button).toHaveTextContent("");
    expect(button).toHaveAttribute("data-icon-only");
  });

  it("opens the share sheet where Web Share is available", async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, share, canShare: () => true });
    try {
      const user = userEvent.setup();
      render(<ShareButton target={target} label="แชร์" />);

      await user.click(screen.getByRole("button", { name: "แชร์" }));

      expect(share).toHaveBeenCalledWith({
        title: target.title,
        text: target.text,
        url: `${window.location.origin}/guides/g1#item-i1`,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("copies the link and shows the toast otherwise", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ShareButton target={target} label="แชร์" />
        <ToastRegion parentTestId="app" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "แชร์" }));

    expect(await screen.findByTestId("app/toast")).toHaveTextContent(
      "คัดลอกลิงก์ร้าน ONIBUS COFFEE แล้ว",
    );
    await expect(navigator.clipboard.readText()).resolves.toBe(
      `${window.location.origin}/guides/g1#item-i1`,
    );
  });
});
