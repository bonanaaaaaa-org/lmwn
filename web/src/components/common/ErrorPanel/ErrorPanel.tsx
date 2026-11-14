import clsx from "clsx";

import { Button } from "@/components/common/Button";
import { useIsOffline } from "@/hooks/useIsOffline";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./ErrorPanel.module.css";

export interface ErrorPanelProps {
  /** Defaults to `m.errorPanel_title()`. */
  title?: string;
  /**
   * Defaults to `m.errorPanel_body()`, or `m.errorPanel_offlineBody()` while the browser is
   * offline: the page wasn't saved for offline use, so the diner knows to reconnect.
   */
  description?: string;
  /** Overrides the browser's online state for the default description (stories and tests). */
  isOffline?: boolean;
  /** Shows the retry button (`m.errorPanel_retry_label()`). Typically TanStack Query's `refetch`. */
  onRetry?: () => void;
  /** While a retry is in flight the button shows as pending and ignores repeat presses. */
  isRetrying?: boolean;
  /**
   * `block` replaces a whole section (e.g. the Guide failed to load); `inline` is a
   * compact banner shown above content that stays visible (e.g. a failed search refresh).
   */
  variant?: "block" | "inline";
  /** Heading level for `title`; use 1 when the panel is the whole page. */
  headingLevel?: 1 | 2 | 3;
  className?: string;
  /** The parent's test ID; the panel is `{parent}/error-panel`, its button `{parent}/error-panel/retry`. */
  parentTestId?: string;
}

/** Tells the diner something failed to load, after automatic retries ran out, and offers a retry. */
export function ErrorPanel({
  title,
  description,
  isOffline,
  onRetry,
  isRetrying = false,
  variant = "block",
  headingLevel = 2,
  className,
  parentTestId,
}: ErrorPanelProps) {
  const browserOffline = useIsOffline();
  const offline = isOffline ?? browserOffline;
  const Heading = `h${headingLevel}` as const;
  const testId = joinTestId(parentTestId, "error-panel");
  return (
    <section
      className={clsx(styles.ErrorPanel__Root, className)}
      data-variant={variant}
      data-testid={testId}
      role="alert"
    >
      <div className={styles.ErrorPanel__Text}>
        <Heading className={styles.ErrorPanel__Title}>
          {title ?? m.errorPanel_title()}
        </Heading>
        <p className={styles.ErrorPanel__Description}>
          {description ??
            (offline ? m.errorPanel_offlineBody() : m.errorPanel_body())}
        </p>
      </div>
      {onRetry && (
        <Button
          variant={variant === "inline" ? "secondary" : "primary"}
          onPress={onRetry}
          isPending={isRetrying}
          testId={`${testId}/retry`}
        >
          {isRetrying
            ? m.errorPanel_retry_pendingLabel()
            : m.errorPanel_retry_label()}
        </Button>
      )}
    </section>
  );
}
