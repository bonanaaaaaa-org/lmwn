"""Restaurant Working Hours, normalised for the browser to compare times against."""

import re
from collections.abc import Iterable
from dataclasses import dataclass

from app.domain.errors import InvalidWorkingHours

MINUTES_PER_DAY = 24 * 60

DAYS_OF_WEEK = range(1, 8)
"""ISO weekdays: 1 = Monday ... 7 = Sunday."""


@dataclass(frozen=True, slots=True)
class WorkingHoursEntry:
    """One upstream Working Hours entry: an ISO weekday and `HH:MM` open/close times."""

    day: int
    open: str
    close: str


@dataclass(frozen=True, slots=True, order=True)
class OpeningRange:
    """A time a Restaurant is open on one day, in minutes since that day's midnight.

    The range covers `opens_at` up to, but not including, `closes_at`. It opens
    within its day (0-1439) and lasts more than 0 and at most 1440 minutes. A range
    that runs past midnight keeps a `closes_at` beyond 1440 on its opening day
    (18:00-02:00 is 1080-1560); one closing exactly at midnight ends at 1440 and
    does not carry into the next day.
    """

    opens_at: int
    closes_at: int

    def __post_init__(self) -> None:
        if not (
            0 <= self.opens_at < MINUTES_PER_DAY
            and self.opens_at < self.closes_at <= self.opens_at + MINUTES_PER_DAY
        ):
            raise InvalidWorkingHours(
                f"opening range {self.opens_at}-{self.closes_at} must open within"
                " the day and close within 24 hours"
            )


@dataclass(frozen=True, slots=True)
class WorkingHours:
    """A Restaurant's opening ranges for each of the 7 days; a day with none is closed.

    `days[0]` is Monday and `days[6]` is Sunday. Each day's ranges are in opening order.
    Read it through `week()` or `on()`, which number days 1 (Monday) to 7 (Sunday).
    """

    days: tuple[tuple[OpeningRange, ...], ...]

    def __post_init__(self) -> None:
        if len(self.days) != len(DAYS_OF_WEEK):
            raise InvalidWorkingHours(
                f"expected 7 days of ranges, got {len(self.days)}"
            )

    def on(self, day: int) -> tuple[OpeningRange, ...]:
        """Ranges opening on an ISO weekday; raises ValueError outside 1-7."""
        return self.days[DAYS_OF_WEEK.index(day)]

    def week(self) -> list[tuple[int, tuple[OpeningRange, ...]]]:
        """Every day from Monday (1) to Sunday (7) with its ranges."""
        return list(zip(DAYS_OF_WEEK, self.days, strict=True))


# ASCII digits only: `\d` would also accept Thai and other Unicode digits.
_HH_MM = re.compile(r"(?P<hours>[01][0-9]|2[0-3]):(?P<minutes>[0-5][0-9])")
_END_OF_DAY = "24:00"


def _to_minutes(time: str) -> int:
    match = _HH_MM.fullmatch(time)
    if match is None:
        raise InvalidWorkingHours(f"time {time!r} is not HH:MM between 00:00 and 23:59")
    return int(match["hours"]) * 60 + int(match["minutes"])


def _to_opening_range(entry: WorkingHoursEntry) -> OpeningRange:
    if entry.day not in DAYS_OF_WEEK:
        raise InvalidWorkingHours(
            f"day {entry.day!r} is outside 1 (Monday) to 7 (Sunday)"
        )
    opens_at = _to_minutes(entry.open)
    if entry.close == _END_OF_DAY:
        # "24:00" is midnight at the end of the opening day; it is never an opening time.
        return OpeningRange(opens_at, MINUTES_PER_DAY)
    closes_at = _to_minutes(entry.close)
    if closes_at <= opens_at:
        # Closing at or before the opening time runs into the next day. The range stays
        # on its opening day, shifted by a day: 18:00-02:00 -> 1080-1560, 17:00-00:00 ->
        # 1020-1440, and equal times (00:00-00:00) mean open for 24 hours.
        closes_at += MINUTES_PER_DAY
    return OpeningRange(opens_at, closes_at)


def normalise_working_hours(entries: Iterable[WorkingHoursEntry]) -> WorkingHours:
    """Turn upstream Working Hours entries into a 7-day WorkingHours.

    Days with no entry are closed. Raises InvalidWorkingHours for a day outside 1-7
    or a time that is not `HH:MM` (`24:00` is accepted as a closing time only), so
    the Restaurant can be treated as an Unavailable Restaurant.
    """
    ranges_by_day: dict[int, list[OpeningRange]] = {day: [] for day in DAYS_OF_WEEK}
    for entry in entries:
        opening_range = _to_opening_range(entry)
        ranges_by_day[entry.day].append(opening_range)
    return WorkingHours(
        tuple(tuple(sorted(ranges_by_day[day])) for day in DAYS_OF_WEEK)
    )
