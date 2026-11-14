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
import { m } from "@/paraglide/messages.js";

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

/** Day names for ISO weekdays 1–7, Monday first; called at render time. */
const dayNames = () => [
  m.restaurantCard_workingHours_monday_label(),
  m.restaurantCard_workingHours_tuesday_label(),
  m.restaurantCard_workingHours_wednesday_label(),
  m.restaurantCard_workingHours_thursday_label(),
  m.restaurantCard_workingHours_friday_label(),
  m.restaurantCard_workingHours_saturday_label(),
  m.restaurantCard_workingHours_sunday_label(),
];

const isClosedOn = (workingHours: readonly WorkingDay[], day: number) =>
  rangesOn(workingHours, day).length === 0;

function hoursText(workingHours: readonly WorkingDay[], day: number): string {
  return isClosedOn(workingHours, day)
    ? m.restaurantCard_workingHours_closed_body()
    : rangesOn(workingHours, day).map(formatOpeningRange).join(", ");
}

function toggleLabel(workingHours: readonly WorkingDay[]): string {
  const names = dayNames();
  const closed = names.filter((_, i) => isClosedOn(workingHours, i + 1));
  if (closed.length === 0) return m.restaurantCard_workingHours_toggle_label();
  if (closed.length === names.length) {
    return m.restaurantCard_workingHours_toggle_closedEveryDayLabel();
  }
  return m.restaurantCard_workingHours_toggle_closedDaysLabel({
    days: closed.join(", "),
  });
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
          <dt className={styles.WorkingHours__Term}>
            {m.restaurantCard_workingHours_title()}
          </dt>
          <dd className={styles.WorkingHours__Today}>
            <OpenStatus
              open={status.open}
              opensAt={
                status.opensAt === undefined
                  ? undefined
                  : formatOpeningTime(status.opensAt)
              }
              closedAllDay={status.closedAllDay}
            />
            <span>
              {status.fromYesterday && status.closesAt !== undefined
                ? m.restaurantCard_workingHours_today_openUntilBody({
                    time: formatOpeningTime(status.closesAt),
                    hours: hoursText(workingHours, today),
                  })
                : m.restaurantCard_workingHours_today_body({
                    hours: hoursText(workingHours, today),
                  })}
            </span>
          </dd>
          <dd>
            <Button slot="trigger" variant="text" testId={`${testId}/toggle`}>
              {isExpanded
                ? m.restaurantCard_workingHours_toggle_expandedLabel()
                : toggleLabel(workingHours)}
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
                  {m.restaurantCard_workingHours_week_caption()}
                </VisuallyHidden>
                <tbody>
                  {dayNames().map((name, i) => {
                    const day = i + 1;
                    const isToday = day === today;
                    return (
                      <tr
                        key={day}
                        className={styles.WorkingHours__Day}
                        aria-current={isToday ? "date" : undefined}
                        data-state={
                          isClosedOn(workingHours, day) ? "closed" : undefined
                        }
                      >
                        <th scope="row">
                          {isToday
                            ? m.restaurantCard_workingHours_week_todayLabel({
                                day: name,
                              })
                            : name}
                        </th>
                        <td>{hoursText(workingHours, day)}</td>
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
