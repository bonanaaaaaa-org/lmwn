"""Restaurants, independent of any Guide."""

from dataclasses import dataclass

from app.domain.working_hours import WorkingHours


@dataclass(frozen=True, slots=True)
class Restaurant:
    """A place to eat. Optional details are None when the Restaurant has none.

    A Rating of 0 with 0 reviews is an Unrated Restaurant: the Rating is unknown,
    not zero stars.
    """

    id: str
    name: str
    rating: float
    number_of_reviews: int
    url: str
    address: str
    lat: float
    lng: float
    phone_no: str
    categories: tuple[str, ...]
    working_hours: WorkingHours
    official: bool
    delivery: bool
    pickup: bool
    branch: str | None = None
    line: str | None = None
    instagram: str | None = None
    facebook: str | None = None
