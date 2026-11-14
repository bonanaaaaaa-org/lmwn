"""Pydantic models of the data server's payloads, as delivered.

Unknown keys (the storage internals `_id` and `__v`, `createdAt`, ...) are ignored.
Validation is strict: `"4.5"` is not a Rating and `"yes"` is not a bool.
Working Hours times stay plain strings here: the domain validates them, so a
malformed time makes one Restaurant unavailable instead of failing a Guide.
"""

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictInt
from pydantic.alias_generators import to_camel

from app.domain.guide import Guide, GuideItem, Photo
from app.domain.restaurant import Restaurant
from app.domain.working_hours import WorkingHoursEntry, normalise_working_hours


class _Payload(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, frozen=True, strict=True)


class PhotoPayload(_Payload):
    id: str
    small_url: str
    large_url: str

    def to_domain(self) -> Photo:
        return Photo(id=self.id, small_url=self.small_url, large_url=self.large_url)


class GuidePayload(_Payload):
    id: str
    title: str
    social_title: str
    short_description: str
    description: str
    cover_photo: PhotoPayload
    tags: list[str]
    write_date: AwareDatetime
    items: list[str]

    def to_domain(self) -> Guide:
        return Guide(
            id=self.id,
            title=self.title,
            social_title=self.social_title,
            short_description=self.short_description,
            description=self.description,
            cover_photo=self.cover_photo.to_domain(),
            tags=tuple(self.tags),
            write_date=self.write_date,
            item_ids=tuple(self.items),
        )


class GuideItemPayload(_Payload):
    id: str
    description: str
    restaurant_id: str
    photos: list[PhotoPayload]

    def to_domain(self) -> GuideItem:
        return GuideItem(
            id=self.id,
            description=self.description,
            restaurant_id=self.restaurant_id,
            photos=tuple(photo.to_domain() for photo in self.photos),
        )


class WorkingHoursEntryPayload(_Payload):
    # StrictInt: `true` or `1.0` must not pass as Monday.
    day: StrictInt
    open: str
    close: str


class RestaurantPayload(_Payload):
    id: str
    name: str
    branch: str | None = None
    rating: float = Field(ge=0, le=5)
    number_of_reviews: StrictInt = Field(ge=0)
    url: str
    address: str
    lat: float
    lng: float
    phone_no: str
    categories: list[str]
    working_hours: list[WorkingHoursEntryPayload]
    official: bool
    delivery: bool
    pickup: bool
    line: str | None = None
    instagram: str | None = None
    facebook: str | None = None

    def to_domain(self) -> Restaurant:
        """Raises InvalidWorkingHours (a DomainError) for malformed Working Hours."""
        return Restaurant(
            id=self.id,
            name=self.name,
            branch=self.branch,
            rating=self.rating,
            number_of_reviews=self.number_of_reviews,
            url=self.url,
            address=self.address,
            lat=self.lat,
            lng=self.lng,
            phone_no=self.phone_no,
            categories=tuple(self.categories),
            working_hours=normalise_working_hours(
                WorkingHoursEntry(day=e.day, open=e.open, close=e.close)
                for e in self.working_hours
            ),
            official=self.official,
            delivery=self.delivery,
            pickup=self.pickup,
            line=self.line,
            instagram=self.instagram,
            facebook=self.facebook,
        )
