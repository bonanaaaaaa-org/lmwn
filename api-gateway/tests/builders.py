"""Domain values for tests, with realistic defaults and per-test overrides."""

from datetime import UTC, datetime

from app.domain.guide import Guide, GuideItem, Photo
from app.domain.restaurant import Restaurant
from app.domain.working_hours import WorkingHoursEntry, normalise_working_hours


def a_photo(photo_id: str = "photo-1") -> Photo:
    return Photo(
        id=photo_id,
        small_url=f"http://localhost:7777/r/480/854/{photo_id}.jpg",
        large_url=f"http://localhost:7777/r/1080/1920/{photo_id}.jpg",
    )


def a_guide(guide_id: str, item_ids: list[str]) -> Guide:
    return Guide(
        id=guide_id,
        title="10 คาเฟ่ลับ One Bangkok!",
        social_title="ไม่อยากจะเชื่อ มีร้านคาเฟ่ดี ๆ แบบนี้ห้างดังย่านลุมพินี",
        short_description="รวมคาเฟ่เด็ดที่ One Bangkok",
        description="รวมสุดยอดคาเฟ่ลับ",
        cover_photo=a_photo("cover"),
        tags=("กาแฟ", "คาเฟ่", "One", "Bangkok"),
        write_date=datetime(2024, 3, 10, 12, tzinfo=UTC),
        item_ids=tuple(item_ids),
    )


def a_guide_item(item_id: str, restaurant_id: str) -> GuideItem:
    return GuideItem(
        id=item_id,
        description=f"write-up for {item_id}",
        restaurant_id=restaurant_id,
        photos=(a_photo(f"{item_id}-1"), a_photo(f"{item_id}-2")),
    )


def a_restaurant(
    restaurant_id: str,
    *,
    branch: str | None = None,
    line: str | None = None,
    instagram: str | None = None,
    facebook: str | None = None,
) -> Restaurant:
    return Restaurant(
        id=restaurant_id,
        name=f"Restaurant {restaurant_id}",
        rating=4.3,
        number_of_reviews=6,
        url=f"https://www.wongnai.com/restaurants/{restaurant_id}",
        address="ลุมพินี ปทุมวัน กรุงเทพมหานคร",
        lat=13.7281616302142,
        lng=100.545122344047,
        phone_no="0939164541",
        categories=("ร้านกาแฟ/ชา",),
        working_hours=normalise_working_hours(
            [WorkingHoursEntry(day, "07:00", "21:00") for day in range(1, 6)]
        ),
        official=True,
        delivery=True,
        pickup=False,
        branch=branch,
        line=line,
        instagram=instagram,
        facebook=facebook,
    )
