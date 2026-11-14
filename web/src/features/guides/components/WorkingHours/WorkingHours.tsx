import clsx from "clsx";
import { VisuallyHidden } from "react-aria";
import { Disclosure, DisclosurePanel } from "react-aria-components";

import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { OpenStatus } from "@/components/common/OpenStatus";
import {
  formatOpeningRange,
  formatOpeningTime,
  openStatus,
  rangesOn,
  weekdayAndMinutes,
} from "@/features/guides/lib/openNow";
import type { WorkingDay } from "@/features/guides/lib/types";
import { useNow } from "@/hooks/useNow";
import { joinTestId } from "@/lib/testIds";

import styles from "./WorkingHours.module.css";

export interface WorkingHoursProps {
  /** The Restaurant's normalised Working Hours from the gateway. */
  workingHours: readonly WorkingDay[];
  /** The gateway's `timeZone`: "today" and Open Now are judged on its wall clock. */
  timeZone: string;
  /** A fixed clock for stories and tests; defaults to the live clock, which ticks each minute. */
  now?: Date;
  /** Start with the full week shown. */
  defaultExpanded?: boolean;
  className?: string;
  /** The card's test ID; this is `{parent}/working-hours`. */
  parentTestId?: string;
}

/** ISO weekdays 1–7, Monday first. */
const DAY_NAMES = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

function hoursText(workingHours: readonly WorkingDay[], day: number): string {
  const ranges = rangesOn(workingHours, day);
  return ranges.length > 0 ? ranges.map(formatOpeningRange).join(", ") : "ปิด";
}

function closedDaysNote(workingHours: readonly WorkingDay[]): string {
  const closed = DAY_NAMES.filter(
    (_, i) => rangesOn(workingHours, i + 1).length === 0,
  );
  if (closed.length === 0) return "";
  if (closed.length === DAY_NAMES.length) return " · ปิดทุกวัน";
  return ` · ปิดวัน${closed.join(", ")}`;
}

/**
 * The Restaurant card's Working Hours: the Open Now badge and today's hours, plus a React
 * Aria disclosure with the whole week. Renders a group of `<dt>`/`<dd>` for the card's
 * details list. Open Now follows the clock while the page stays open.
 */
export function WorkingHours({
  workingHours,
  timeZone,
  now: fixedNow,
  defaultExpanded,
  className,
  parentTestId,
}: WorkingHoursProps) {
  const testId = joinTestId(parentTestId, "working-hours");
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const today = weekdayAndMinutes(now, timeZone).day;
  const status = openStatus(workingHours, now, timeZone);

  return (
    <Disclosure
      className={clsx(styles.WorkingHours__Root, className)}
      defaultExpanded={defaultExpanded}
      data-testid={testId}
    >
      {({ isExpanded }) => (
        <>
          <dt className={styles.WorkingHours__Term}>เวลาทำการ</dt>
          <dd className={styles.WorkingHours__Today}>
            <OpenStatus
              open={status.open}
              opensAt={
                status.opensAt === undefined
                  ? undefined
                  : formatOpeningTime(status.opensAt)
              }
            />
            <span>
              {/* Open on yesterday's late range: say until when, then today's own hours. */}
              {status.fromYesterday && status.closesAt !== undefined
                ? `เปิดถึง ${formatOpeningTime(status.closesAt)} · `
                : ""}
              วันนี้ {hoursText(workingHours, today)}
            </span>
          </dd>
          <dd>
            <Button slot="trigger" variant="text" testId={`${testId}/toggle`}>
              {isExpanded
                ? "ซ่อนเวลาทั้งสัปดาห์"
                : `ดูเวลาทั้งสัปดาห์${closedDaysNote(workingHours)}`}
              <Icon
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
              />
            </Button>
          </dd>
          <dd>
            <DisclosurePanel>
              <table className={styles.WorkingHours__Week}>
                <VisuallyHidden elementType="caption">
                  เวลาทำการทั้งสัปดาห์
                </VisuallyHidden>
                <tbody>
                  {DAY_NAMES.map((name, i) => {
                    const day = i + 1;
                    const isToday = day === today;
                    const hours = hoursText(workingHours, day);
                    return (
                      <tr
                        key={day}
                        className={styles.WorkingHours__Day}
                        aria-current={isToday ? "date" : undefined}
                        data-state={hours === "ปิด" ? "closed" : undefined}
                      >
                        <th scope="row">{isToday ? `${name} (วันนี้)` : name}</th>
                        <td>{hours}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DisclosurePanel>
          </dd>
        </>
      )}
    </Disclosure>
  );
}
