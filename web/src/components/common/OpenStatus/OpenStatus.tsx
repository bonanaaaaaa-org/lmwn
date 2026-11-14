import clsx from "clsx";

import { m } from "@/paraglide/messages.js";

import styles from "./OpenStatus.module.css";

export interface OpenStatusProps {
  /** Whether the Restaurant is Open Now. */
  open: boolean;
  /** While closed, today's next opening time ("10:00"). */
  opensAt?: string;
  /**
   * While closed with no `opensAt`: today has no opening hours at all, so the badge reads
   * `m.openStatus_closed_todayLabel()` (closed today). Otherwise today's hours are over and it
   * reads `m.openStatus_closed_forTheDayLabel()` (closed for the day).
   */
  closedAllDay?: boolean;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/**
 * The Open Now badge: `m.openStatus_open_label()` with a filled dot, or, closed, with a ring:
 * `m.openStatus_closed_opensAtLabel()` (opens later today), `m.openStatus_closed_forTheDayLabel()`
 * (today's hours are over) or `m.openStatus_closed_todayLabel()` (closed all day). The
 * words carry the state; colour and dot shape only repeat it.
 */
export function OpenStatus({
  open,
  opensAt,
  closedAllDay = false,
  className,
  testId,
}: OpenStatusProps) {
  let label = m.openStatus_open_label();
  if (!open) {
    if (opensAt) label = m.openStatus_closed_opensAtLabel({ time: opensAt });
    else if (closedAllDay) label = m.openStatus_closed_todayLabel();
    else label = m.openStatus_closed_forTheDayLabel();
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
