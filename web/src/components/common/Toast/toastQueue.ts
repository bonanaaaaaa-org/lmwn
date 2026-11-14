import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

export interface ToastContent {
  message: string;
  /** `success` shows a saffron check; `error` an alert icon. */
  tone?: "success" | "error";
}

/** How long a toast stays up, unless hovered or focused (React Aria pauses it then). */
export const TOAST_TIMEOUT_MS = 4000;

/** The app's one toast queue, rendered by the `ToastRegion` in the app shell. */
export const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 1 });

/**
 * Shows a toast in place of whatever toast is up, so repeated presses never stack them.
 * `queue` is for tests and stories.
 */
export function showToast(
  content: ToastContent,
  queue: ToastQueue<ToastContent> = toastQueue,
): void {
  for (const toast of queue.visibleToasts) queue.close(toast.key);
  queue.add(content, { timeout: TOAST_TIMEOUT_MS });
}
