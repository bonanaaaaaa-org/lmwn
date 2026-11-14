import clsx from "clsx";

import { Button } from "@/components/common/Button";
import { joinTestId } from "@/lib/testIds";

import styles from "./ErrorPanel.module.css";

export interface ErrorPanelProps {
  title?: string;
  description?: string;
  /** Shows the "ลองใหม่" (try again) button. Typically TanStack Query's `refetch`. */
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
  title = "โหลดข้อมูลไม่สำเร็จ",
  description = "เซิร์ฟเวอร์ไม่ตอบสนองในขณะนี้ ลองใหม่อีกครั้งในอีกสักครู่",
  onRetry,
  isRetrying = false,
  variant = "block",
  headingLevel = 2,
  className,
  parentTestId,
}: ErrorPanelProps) {
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
        <Heading className={styles.ErrorPanel__Title}>{title}</Heading>
        <p className={styles.ErrorPanel__Description}>{description}</p>
      </div>
      {onRetry && (
        <Button
          variant={variant === "inline" ? "secondary" : "primary"}
          onPress={onRetry}
          isPending={isRetrying}
          testId={`${testId}/retry`}
        >
          {isRetrying ? "กำลังลองใหม่…" : "ลองใหม่"}
        </Button>
      )}
    </section>
  );
}
