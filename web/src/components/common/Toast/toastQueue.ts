import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

export interface ToastContent {
  message: string;
  /** `success` shows a saffron check; `error` an alert icon. */
  tone?: "success" | "error";
  /**
   * A button next to the message (e.g. "update" for a new version). Pressing it runs `onAction`
   * and closes the toast. A toast with an action stays until it is used or closed, rather than
   * timing out before the diner can reach it.
   */
  action?: { label: string; onAction: () => void };
}

/** How long a toast stays up, unless hovered or focused (React Aria pauses it then). */
export const TOAST_TIMEOUT_MS = 4000;

/** The app's one toast queue, rendered by the `ToastRegion` in the app shell. */
export const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 1 });

/**
 * Shows a toast in place of whatever toast is up, so repeated presses never stack them. It
 * closes after TOAST_TIMEOUT_MS, unless it has an action. `queue` is for tests and stories.
 */
export function showToast(
  content: ToastContent,
  queue: ToastQueue<ToastContent> = toastQueue,
): void {
  for (const toast of queue.visibleToasts) queue.close(toast.key);
  queue.add(content, content.action ? {} : { timeout: TOAST_TIMEOUT_MS });
}
