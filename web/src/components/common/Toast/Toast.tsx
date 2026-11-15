import clsx from "clsx";
import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
  type UNSTABLE_ToastQueue as ToastQueue,
} from "react-aria-components";

import { Icon } from "@/components/common/Icon";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./Toast.module.css";
import { type ToastContent, toastQueue } from "./toastQueue";

export interface ToastRegionProps {
  /** Defaults to the app's queue; `showToast()` adds to it. */
  queue?: ToastQueue<ToastContent>;
  className?: string;
  /**
   * The shell's test ID; each toast is `{parent}/toast`, its action button `{parent}/toast/action`
   * and its close button `{parent}/toast/close`.
   */
  parentTestId?: string;
}

/**
 * Where toasts appear: centred at the bottom of the viewport, above the page. Each toast is an
 * ink pill with a saffron check and its message, announced politely, then an optional action
 * button and a close button. Hovering or focusing it pauses its timer.
 */
export function ToastRegion({
  queue = toastQueue,
  className,
  parentTestId,
}: ToastRegionProps) {
  const testId = joinTestId(parentTestId, "toast");
  return (
    <AriaToastRegion
      queue={queue}
      aria-label={m.toast_region_ariaLabel()}
      className={clsx(styles.Toast__Region, className)}
    >
      {({ toast }) => {
        const tone = toast.content.tone ?? "success";
        return (
          <AriaToast
            toast={toast}
            className={styles.Toast__Root}
            data-tone={tone}
            data-testid={testId}
          >
            {/* A status, not an alert: "link copied" never needs to interrupt. */}
            <AriaToastContent
              role="status"
              aria-live="polite"
              className={styles.Toast__Content}
            >
              <Icon
                name={tone === "error" ? "alert" : "check"}
                size={18}
                strokeWidth={2.4}
                tone={tone === "error" ? "danger-inverse" : "accent"}
                className={styles.Toast__Icon}
              />
              <Text slot="title">{toast.content.message}</Text>
            </AriaToastContent>
            {toast.content.action && (
              <Button
                className={styles.Toast__Action}
                data-testid={`${testId}/action`}
                onPress={() => {
                  toast.content.action?.onAction();
                  queue.close(toast.key);
                }}
              >
                {toast.content.action.label}
              </Button>
            )}
            <Button
              slot="close"
              aria-label={m.toast_close_ariaLabel()}
              className={styles.Toast__Close}
              data-testid={`${testId}/close`}
            >
              <Icon name="close" size={16} />
            </Button>
          </AriaToast>
        );
      }}
    </AriaToastRegion>
  );
}
