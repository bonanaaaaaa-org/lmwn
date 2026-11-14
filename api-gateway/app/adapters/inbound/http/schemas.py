"""Response models: the gateway's own contract with the web app.

JSON is camelCase. Optional Restaurant details absent upstream are left out of the
response rather than sent as `null`.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from pydantic.json_schema import SkipJsonSchema

from app.application.get_guide_detail import GuideDetail, GuideDetailItem
from app.domain.guide import Guide, Photo
from app.domain.restaurant import Restaurant
from app.domain.working_hours import OpeningRange, WorkingHours

TIME_ZONE: Literal["Asia/Bangkok"] = "Asia/Bangkok"


def _is_none(value: object) -> bool:
    return value is None


class _Response(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ErrorResponse(BaseModel):
    detail: str


class PhotoResponse(_Response):
    id: str
    small_url: str
    large_url: str

    @classmethod
    def from_domain(cls, photo: Photo) -> PhotoResponse:
        return cls(id=photo.id, small_url=photo.small_url, large_url=photo.large_url)


class OpeningRangeResponse(_Response):
    """Minutes since midnight of the opening day; the range excludes `closesAt`.

    A range that runs past midnight keeps a `closesAt` above 1440 (18:00-02:00 is
    1080-1560).
    """

    opens_at: int = Field(ge=0, lt=1440)
    closes_at: int = Field(gt=0, le=2880)

    @classmethod
    def from_domain(cls, opening_range: OpeningRange) -> OpeningRangeResponse:
        return cls(opens_at=opening_range.opens_at, closes_at=opening_range.closes_at)


class WorkingDayResponse(_Response):
    """One ISO weekday (1 = Monday ... 7 = Sunday); no ranges means closed."""

    day: int = Field(ge=1, le=7)
    ranges: list[OpeningRangeResponse]


def _working_days(working_hours: WorkingHours) -> list[WorkingDayResponse]:
    return [
        WorkingDayResponse(
            day=day, ranges=[OpeningRangeResponse.from_domain(r) for r in ranges]
        )
        for day, ranges in working_hours.week()
    ]


class RestaurantResponse(_Response):
    id: str
    name: str
    branch: str | SkipJsonSchema[None] = Field(
        default=None,
        exclude_if=_is_none,
        description="Left out when the Restaurant has no branch.",
    )
    rating: float = Field(
        ge=0, le=5, description="0 with numberOfReviews 0 means an Unrated Restaurant."
    )
    number_of_reviews: int = Field(ge=0)
    url: str = Field(description="The Restaurant's page on Wongnai.")
    address: str
    lat: float
    lng: float
    phone_no: str
    categories: list[str]
    working_hours: list[WorkingDayResponse] = Field(
        description="All 7 days, Monday first, in the Guide's timeZone."
    )
    official: bool
    delivery: bool
    pickup: bool
    line: str | SkipJsonSchema[None] = Field(
        default=None,
        exclude_if=_is_none,
        description="Left out when the Restaurant has no LINE account.",
    )
    instagram: str | SkipJsonSchema[None] = Field(
        default=None,
        exclude_if=_is_none,
        description="Left out when the Restaurant has no Instagram.",
    )
    facebook: str | SkipJsonSchema[None] = Field(
        default=None,
        exclude_if=_is_none,
        description="Left out when the Restaurant has no Facebook page.",
    )

    @classmethod
    def from_domain(cls, restaurant: Restaurant) -> RestaurantResponse:
        return cls(
            id=restaurant.id,
            name=restaurant.name,
            branch=restaurant.branch,
            rating=restaurant.rating,
            number_of_reviews=restaurant.number_of_reviews,
            url=restaurant.url,
            address=restaurant.address,
            lat=restaurant.lat,
            lng=restaurant.lng,
            phone_no=restaurant.phone_no,
            categories=list(restaurant.categories),
            working_hours=_working_days(restaurant.working_hours),
            official=restaurant.official,
            delivery=restaurant.delivery,
            pickup=restaurant.pickup,
            line=restaurant.line,
            instagram=restaurant.instagram,
            facebook=restaurant.facebook,
        )


class GuideItemResponse(_Response):
    id: str
    description: str = Field(description="The editor's write-up of the Restaurant.")
    photos: list[PhotoResponse]
    restaurant: RestaurantResponse | None = Field(
        description="`null` for an Unavailable Restaurant: its details couldn't be loaded."
    )

    @classmethod
    def from_domain(cls, entry: GuideDetailItem) -> GuideItemResponse:
        return cls(
            id=entry.item.id,
            description=entry.item.description,
            photos=[PhotoResponse.from_domain(p) for p in entry.item.photos],
            restaurant=(
                RestaurantResponse.from_domain(entry.restaurant)
                if entry.restaurant
                else None
            ),
        )


class GuideDetailResponse(_Response):
    id: str
    title: str
    social_title: str
    short_description: str
    description: str
    cover_photo: PhotoResponse
    tags: list[str]
    write_date: datetime
    time_zone: Literal["Asia/Bangkok"] = Field(
        description="The time zone Working Hours are given in."
    )
    items: list[GuideItemResponse] = Field(
        description="Guide Items in the editor's order."
    )

    @classmethod
    def from_domain(cls, detail: GuideDetail) -> GuideDetailResponse:
        guide = detail.guide
        return cls(
            id=guide.id,
            title=guide.title,
            social_title=guide.social_title,
            short_description=guide.short_description,
            description=guide.description,
            cover_photo=PhotoResponse.from_domain(guide.cover_photo),
            tags=list(guide.tags),
            write_date=guide.write_date,
            time_zone=TIME_ZONE,
            items=[GuideItemResponse.from_domain(entry) for entry in detail.items],
        )


class GuideSummaryResponse(_Response):
    """A Guide as the Guide Index shows it."""

    id: str
    title: str
    short_description: str
    cover_photo: PhotoResponse
    tags: list[str]
    item_count: int = Field(ge=0, description="How many Guide Items the Guide has.")

    @classmethod
    def from_domain(cls, guide: Guide) -> GuideSummaryResponse:
        return cls(
            id=guide.id,
            title=guide.title,
            short_description=guide.short_description,
            cover_photo=PhotoResponse.from_domain(guide.cover_photo),
            tags=list(guide.tags),
            item_count=len(guide.item_ids),
        )


class GuideListResponse(_Response):
    """Matching Guides in upstream order. Not paginated: `total` is `len(items)`."""

    items: list[GuideSummaryResponse]
    total: int = Field(ge=0)

    @classmethod
    def from_domain(cls, guides: list[Guide]) -> GuideListResponse:
        return cls(
            items=[GuideSummaryResponse.from_domain(g) for g in guides],
            total=len(guides),
        )
