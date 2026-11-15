import clsx from "clsx";

import { m } from "@/paraglide/messages.js";

import styles from "./OpenStatus.module.css";

export interface OpenStatusProps {
  /** Whether the Restaurant is Open Now. */
  open: boolean;
  /** While closed, today's next opening time ("10:00"). */
  opensAt?: string;
  /**
   * With `opensAt`: today's hours haven't started yet, so the badge reads
   * `m.openStatus_closed_notOpenYetLabel()` (not open yet) instead of
   * `m.openStatus_closed_opensAtLabel()` (closed for a break between today's hours).
   */
  notOpenYet?: boolean;
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
 * `m.openStatus_closed_notOpenYetLabel()` (today's hours haven't started),
 * `m.openStatus_closed_opensAtLabel()` (a break between today's hours), `m.openStatus_closed_forTheDayLabel()`
 * (today's hours are over) or `m.openStatus_closed_todayLabel()` (closed all day). The
 * words carry the state; colour and dot shape only repeat it.
 */
export function OpenStatus({
  open,
  opensAt,
  notOpenYet = false,
  closedAllDay = false,
  className,
  testId,
}: OpenStatusProps) {
  let label = m.openStatus_open_label();
  if (!open) {
    if (opensAt && notOpenYet)
      label = m.openStatus_closed_notOpenYetLabel({ time: opensAt });
    else if (opensAt)
      label = m.openStatus_closed_opensAtLabel({ time: opensAt });
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
