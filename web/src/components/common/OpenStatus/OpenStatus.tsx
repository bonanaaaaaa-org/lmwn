import clsx from "clsx";

import { m } from "@/paraglide/messages.js";

import styles from "./OpenStatus.module.css";

export interface OpenStatusProps {
  /** Whether the Restaurant is Open Now. */
  open: boolean;
  /** While closed, today's next opening time ("10:00"); without it the badge reads `m.openStatus_closed_todayLabel()`. */
  opensAt?: string;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/**
 * The Open Now badge: `m.openStatus_open_label()` with a filled dot, or, closed,
 * `m.openStatus_closed_opensAtLabel()` / `m.openStatus_closed_todayLabel()` with a ring. The
 * words carry the state; colour and dot shape only repeat it.
 */
export function OpenStatus({
  open,
  opensAt,
  className,
  testId,
}: OpenStatusProps) {
  let label = m.openStatus_open_label();
  if (!open) {
    label = opensAt
      ? m.openStatus_closed_opensAtLabel({ time: opensAt })
      : m.openStatus_closed_todayLabel();
  }
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
