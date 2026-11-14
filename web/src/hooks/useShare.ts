import { useCallback } from "react";

import { showToast } from "@/components/common/Toast";
import { m } from "@/paraglide/messages.js";

/** What to share: the share sheet's title and text, the link, and the toast if it's copied instead. */
export interface ShareTarget {
  title: string;
  text: string;
  /** Absolute, or relative to the current page (resolved when shared). */
  url: string;
  /** Shown in a toast after the link is copied, where the Web Share API isn't available. */
  copiedMessage: string;
}

/**
 * `shared` the share sheet completed · `copied` the link was copied (toast shown) ·
 * `cancelled` the diner closed the share sheet · `failed` the link couldn't be copied (toast
 * shown) · `busy` a share was already in progress, so this press was ignored.
 */
export type ShareOutcome =
  | "shared"
  | "copied"
  | "cancelled"
  | "failed"
  | "busy";

type ShareNavigator = Pick<Navigator, "share" | "canShare" | "clipboard">;

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/**
 * Opens the device share sheet where the Web Share API can share `target`, otherwise copies
 * its link and confirms with a toast. Any share error other than the diner cancelling falls
 * back to copying, so the press is never a dead end.
 */
export async function shareOrCopy(
  target: ShareTarget,
  nav: ShareNavigator = navigator,
  baseUrl: string = window.location.href,
): Promise<Exclude<ShareOutcome, "busy">> {
  const url = new URL(target.url, baseUrl).href;
  const data: ShareData = { title: target.title, text: target.text, url };

  // `canShare` is missing on some browsers that do have `share`: then just try.
  if (typeof nav.share === "function" && (nav.canShare?.(data) ?? true)) {
    try {
      await nav.share(data);
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }

  try {
    await nav.clipboard.writeText(url);
    showToast({ message: target.copiedMessage });
    return "copied";
  } catch {
    showToast({ message: m.shareButton_copyFailed_body(), tone: "error" });
    return "failed";
  }
}

/** The page has one share sheet, so one share at a time across every share button. */
let shareInFlight = false;

/**
 * `share(target)`, safe to press repeatedly: while a share sheet is open (or a copy is in
 * flight), presses on any share button are ignored instead of opening a second sheet, which
 * browsers reject with `InvalidStateError`.
 */
export function useShare(): (target: ShareTarget) => Promise<ShareOutcome> {
  return useCallback(async (target: ShareTarget) => {
    if (shareInFlight) return "busy";
    shareInFlight = true;
    try {
      return await shareOrCopy(target);
    } finally {
      shareInFlight = false;
    }
  }, []);
}
