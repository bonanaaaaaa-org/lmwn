import { act, renderHook } from "@testing-library/react";

import { toastQueue } from "@/components/common/Toast";
import { m } from "@/paraglide/messages.js";

import { shareOrCopy, type ShareTarget, useShare } from "./useShare";

const target: ShareTarget = {
  title: "Guide title",
  text: "Share text",
  url: "/guides/g1#item-i1",
  copiedMessage: "Link copied",
};
const BASE = "https://gems.example/guides/g1?category=x";
const ABSOLUTE = "https://gems.example/guides/g1#item-i1";

function fakeNavigator(overrides: Partial<Navigator> = {}) {
  return {
    clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    ...overrides,
  } as unknown as Pick<Navigator, "share" | "canShare" | "clipboard">;
}

const toastMessages = () =>
  toastQueue.visibleToasts.map((toast) => toast.content);

afterEach(() => {
  for (const toast of toastQueue.visibleToasts) toastQueue.close(toast.key);
  vi.unstubAllGlobals();
});

describe("shareOrCopy", () => {
  it("opens the share sheet with the absolute link where Web Share is supported", async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = fakeNavigator({ share, canShare: () => true });

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("shared");

    expect(share).toHaveBeenCalledWith({
      title: target.title,
      text: target.text,
      url: ABSOLUTE,
    });
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
    expect(toastMessages()).toEqual([]);
  });

  it("tries to share when the browser has share but no canShare", async () => {
    const share = vi.fn(() => Promise.resolve());

    await expect(
      shareOrCopy(target, fakeNavigator({ share }), BASE),
    ).resolves.toBe("shared");
  });

  it("copies the link and confirms with a toast when Web Share is missing", async () => {
    const nav = fakeNavigator();

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("copied");

    expect(nav.clipboard.writeText).toHaveBeenCalledWith(ABSOLUTE);
    expect(toastMessages()).toEqual([{ message: "Link copied" }]);
  });

  it("copies when canShare rejects the data", async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = fakeNavigator({ share, canShare: () => false });

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("copied");
    expect(share).not.toHaveBeenCalled();
  });

  it("does nothing more when the diner cancels the share sheet", async () => {
    const nav = fakeNavigator({
      share: () => Promise.reject(new DOMException("cancel", "AbortError")),
    });

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("cancelled");
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
    expect(toastMessages()).toEqual([]);
  });

  it("falls back to copying when sharing fails for another reason", async () => {
    const nav = fakeNavigator({
      share: () => Promise.reject(new DOMException("no", "NotAllowedError")),
    });

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("copied");
    expect(nav.clipboard.writeText).toHaveBeenCalledWith(ABSOLUTE);
  });

  it("says so in a toast when the link can't be copied", async () => {
    const nav = fakeNavigator({
      clipboard: {
        writeText: () => Promise.reject(new Error("denied")),
      } as unknown as Clipboard,
    });

    await expect(shareOrCopy(target, nav, BASE)).resolves.toBe("failed");
    expect(toastMessages()).toEqual([
      { message: m.shareButton_copyFailed_body(), tone: "error" },
    ]);
  });

  it("shows one toast however many times the link is copied", async () => {
    const nav = fakeNavigator();

    await shareOrCopy(target, nav, BASE);
    await shareOrCopy({ ...target, copiedMessage: "Copied again" }, nav, BASE);

    expect(toastMessages()).toEqual([{ message: "Copied again" }]);
  });
});

describe("useShare", () => {
  it("ignores presses while a share sheet is open, then shares again once it closes", async () => {
    let close: () => void = () => {};
    const share = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          close = resolve;
        }),
    );
    vi.stubGlobal("navigator", fakeNavigator({ share }));
    const { result } = renderHook(() => useShare());

    let first: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current(target);
      await expect(result.current(target)).resolves.toBe("busy");
    });
    expect(share).toHaveBeenCalledTimes(1);

    await act(async () => {
      close();
      await expect(first).resolves.toBe("shared");
    });
    await act(async () => {
      const again = result.current(target);
      close();
      await expect(again).resolves.toBe("shared");
    });
    expect(share).toHaveBeenCalledTimes(2);
  });

  it("keeps one share sheet across share buttons", async () => {
    let close: () => void = () => {};
    const share = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          close = resolve;
        }),
    );
    vi.stubGlobal("navigator", fakeNavigator({ share }));
    const header = renderHook(() => useShare());
    const card = renderHook(() => useShare());

    await act(async () => {
      const first = header.result.current(target);
      await expect(card.result.current(target)).resolves.toBe("busy");
      close();
      await first;
    });
    expect(share).toHaveBeenCalledTimes(1);
  });
});
