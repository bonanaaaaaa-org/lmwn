import pytest

from app.domain.errors import DomainError, InvalidWorkingHours
from app.domain.working_hours import (
    OpeningRange,
    WorkingHours,
    WorkingHoursEntry,
    normalise_working_hours,
)


def test_hh_mm_times_become_minutes_since_midnight() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=1, open="08:30", close="17:45")]
    )

    assert hours.on(1) == (OpeningRange(opens_at=510, closes_at=1065),)


def test_every_day_from_monday_to_sunday_is_present_and_missing_days_are_closed() -> (
    None
):
    hours = normalise_working_hours(
        [
            WorkingHoursEntry(day=1, open="10:00", close="20:00"),
            WorkingHoursEntry(day=5, open="10:00", close="20:00"),
        ]
    )

    assert [day for day, _ in hours.week()] == [1, 2, 3, 4, 5, 6, 7]
    assert hours.on(1) == (OpeningRange(600, 1200),)
    assert hours.on(5) == (OpeningRange(600, 1200),)
    for closed_day in (2, 3, 4, 6, 7):
        assert hours.on(closed_day) == ()


def test_no_entries_means_closed_every_day() -> None:
    hours = normalise_working_hours([])

    assert all(ranges == () for _, ranges in hours.week())


def test_a_range_closing_before_it_opens_runs_past_midnight_on_its_opening_day() -> (
    None
):
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=1, open="18:00", close="02:00")]
    )

    assert hours.on(1) == (OpeningRange(1080, 1560),)
    assert hours.on(2) == ()


def test_sunday_overnight_range_stays_on_sunday() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=7, open="22:00", close="03:30")]
    )

    assert hours.on(7) == (OpeningRange(1320, 1650),)
    assert hours.on(1) == ()


def test_opening_at_midnight_starts_at_zero() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=3, open="00:00", close="06:00")]
    )

    assert hours.on(3) == (OpeningRange(0, 360),)


def test_closing_at_midnight_ends_at_1440() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=3, open="17:00", close="00:00")]
    )

    assert hours.on(3) == (OpeningRange(1020, 1440),)


def test_same_open_and_close_time_means_open_for_24_hours() -> None:
    hours = normalise_working_hours(
        [
            WorkingHoursEntry(day=4, open="00:00", close="00:00"),
            WorkingHoursEntry(day=5, open="09:00", close="09:00"),
        ]
    )

    assert hours.on(4) == (OpeningRange(0, 1440),)
    assert hours.on(5) == (OpeningRange(540, 1980),)


def test_a_day_with_several_ranges_keeps_them_all_in_opening_order() -> None:
    hours = normalise_working_hours(
        [
            WorkingHoursEntry(day=2, open="17:00", close="22:00"),
            WorkingHoursEntry(day=2, open="11:00", close="14:30"),
        ]
    )

    assert hours.on(2) == (OpeningRange(660, 870), OpeningRange(1020, 1320))


@pytest.mark.parametrize("day", [0, 8, -1])
def test_a_day_outside_monday_to_sunday_is_invalid(day: int) -> None:
    with pytest.raises(InvalidWorkingHours, match="day"):
        normalise_working_hours(
            [WorkingHoursEntry(day=day, open="10:00", close="20:00")]
        )


@pytest.mark.parametrize(
    "time",
    [
        "",
        "9:00",
        "09:0",
        "0900",
        "09:00:00",
        "23:60",
        "ab:cd",
        " 09:00",
        "09:00 ",
        "-1:00",
        "+9:00",
        "\u0e51\u0e50:00",  # Thai digits match str.isdigit but are not HH:MM
    ],
)
def test_a_time_that_is_not_hh_mm_is_invalid(time: str) -> None:
    with pytest.raises(InvalidWorkingHours, match="HH:MM"):
        normalise_working_hours([WorkingHoursEntry(day=1, open=time, close="20:00")])
    with pytest.raises(InvalidWorkingHours, match="HH:MM"):
        normalise_working_hours([WorkingHoursEntry(day=1, open="10:00", close=time)])


def test_invalid_working_hours_is_a_domain_error() -> None:
    with pytest.raises(DomainError):
        normalise_working_hours([WorkingHoursEntry(day=9, open="10:00", close="20:00")])


@pytest.mark.parametrize("day", [0, 8])
def test_asking_for_a_day_outside_monday_to_sunday_is_an_error(day: int) -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=7, open="10:00", close="20:00")]
    )

    with pytest.raises(ValueError):
        hours.on(day)


def test_working_hours_must_cover_exactly_7_days() -> None:
    with pytest.raises(InvalidWorkingHours, match="7 days"):
        WorkingHours(days=((), ()))


def test_upstream_week_with_a_closed_day_normalises_as_expected() -> None:
    # Shaped like the Data Server's Restaurant `workingHours`: one range per day, Sunday missing.
    upstream = [
        WorkingHoursEntry(day=day, open="07:00", close="19:00")
        for day in (1, 2, 3, 4, 5, 6)
    ]

    hours = normalise_working_hours(upstream)

    assert hours.week() == [
        (1, (OpeningRange(420, 1140),)),
        (2, (OpeningRange(420, 1140),)),
        (3, (OpeningRange(420, 1140),)),
        (4, (OpeningRange(420, 1140),)),
        (5, (OpeningRange(420, 1140),)),
        (6, (OpeningRange(420, 1140),)),
        (7, ()),
    ]


def test_the_last_minute_of_the_day_is_a_valid_time() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=1, open="00:00", close="23:59")]
    )

    assert hours.on(1) == (OpeningRange(0, 1439),)


def test_closing_at_24_00_means_closing_at_midnight() -> None:
    hours = normalise_working_hours(
        [WorkingHoursEntry(day=6, open="17:00", close="24:00")]
    )

    assert hours.on(6) == (OpeningRange(1020, 1440),)


def test_opening_at_24_00_is_invalid() -> None:
    with pytest.raises(InvalidWorkingHours, match="HH:MM"):
        normalise_working_hours([WorkingHoursEntry(day=6, open="24:00", close="02:00")])


@pytest.mark.parametrize(
    ("opens_at", "closes_at"),
    [(-1, 60), (1440, 1500), (600, 600), (600, 500), (600, 2041)],
)
def test_an_opening_range_must_open_within_the_day_and_close_within_24_hours(
    opens_at: int, closes_at: int
) -> None:
    with pytest.raises(InvalidWorkingHours, match="range"):
        OpeningRange(opens_at, closes_at)


@pytest.mark.parametrize(("opens_at", "closes_at"), [(0, 1), (0, 1440), (1439, 2879)])
def test_opening_range_boundaries_that_are_valid(opens_at: int, closes_at: int) -> None:
    assert OpeningRange(opens_at, closes_at).closes_at == closes_at
