import clsx from "clsx";

import styles from "./OpenStatus.module.css";

export interface OpenStatusProps {
  /** Whether the Restaurant is Open Now. */
  open: boolean;
  /** While closed, today's next opening time ("10:00"); without it the badge reads "ปิดวันนี้". */
  opensAt?: string;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/**
 * The Open Now badge: "เปิดอยู่" (open) with a filled dot, or "ปิดอยู่ · เปิด 10:00" (closed,
 * opens at …) / "ปิดวันนี้" (closed today) with a ring. The words carry the state; colour
 * and dot shape only repeat it.
 */
export function OpenStatus({
  open,
  opensAt,
  className,
  testId,
}: OpenStatusProps) {
  let label = "เปิดอยู่";
  if (!open) label = opensAt ? `ปิดอยู่ · เปิด ${opensAt}` : "ปิดวันนี้";
  return (
    <span
      className={clsx(styles.OpenStatus__Root, className)}
      data-state={open ? "open" : "closed"}
      data-testid={testId}
    >
      <span className={styles.OpenStatus__Dot} aria-hidden="true" />
      {label}
    </span>
  );
}
