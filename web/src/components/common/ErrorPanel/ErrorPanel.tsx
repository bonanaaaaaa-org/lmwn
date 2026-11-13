import clsx from "clsx";

import { Button } from "@/components/common/Button";

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
}

/** Tells the diner something failed to load, after automatic retries ran out, and offers a retry. */
export function ErrorPanel({
  title = "โหลดข้อมูลไม่สำเร็จ",
  description = "เกิดข้อผิดพลาดในการเชื่อมต่อ ลองใหม่อีกครั้ง",
  onRetry,
  isRetrying = false,
  variant = "block",
  headingLevel = 2,
  className,
}: ErrorPanelProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section
      className={clsx(styles.ErrorPanel__Root, className)}
      data-variant={variant}
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
        >
          ลองใหม่
        </Button>
      )}
    </section>
  );
}
