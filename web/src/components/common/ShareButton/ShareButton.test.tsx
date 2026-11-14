import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastRegion, toastQueue } from "@/components/common/Toast";
import { guideItemShareTarget } from "@/features/guides/lib/share";
import type { ShareTarget } from "@/hooks/useShare";
import { m } from "@/paraglide/messages.js";
import { makeGuide, makeGuideItem } from "@/test-utils/fixtures/guides";

import { ShareButton } from "./ShareButton";

const target: ShareTarget = {
  ...guideItemShareTarget(makeGuide(), makeGuideItem())!,
  url: "/guides/g1#item-i1",
};
const guideLabel = () => m.guideHeader_share_label();
const cardLabel = () =>
  m.restaurantCard_share_ariaLabel({ restaurant: "ONIBUS COFFEE" });

afterEach(() => {
  act(() => {
    for (const toast of toastQueue.visibleToasts) toastQueue.close(toast.key);
  });
});

describe("ShareButton", () => {
  it("shows its label with the share icon", () => {
    render(
      <ShareButton target={target} label={guideLabel()} testId="x/share" />,
    );

    const button = screen.getByRole("button", { name: guideLabel() });
    expect(button).toHaveTextContent(guideLabel());
    expect(button).toHaveAttribute("data-testid", "x/share");
    expect(button).not.toHaveAttribute("data-icon-only");
  });

  it("is a named icon-only button with iconOnly", () => {
    render(<ShareButton target={target} label={cardLabel()} iconOnly />);

    const button = screen.getByRole("button", {
      name: cardLabel(),
    });
    expect(button).toHaveTextContent("");
    expect(button).toHaveAttribute("data-icon-only");
  });

  it("opens the share sheet where Web Share is available", async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, share, canShare: () => true });
    try {
      const user = userEvent.setup();
      render(<ShareButton target={target} label={guideLabel()} />);

      await user.click(screen.getByRole("button", { name: guideLabel() }));

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
        <ShareButton target={target} label={guideLabel()} />
        <ToastRegion parentTestId="app" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: guideLabel() }));

    expect(await screen.findByTestId("app/toast")).toHaveTextContent(
      target.copiedMessage,
    );
    await expect(navigator.clipboard.readText()).resolves.toBe(
      `${window.location.origin}/guides/g1#item-i1`,
    );
  });
});
