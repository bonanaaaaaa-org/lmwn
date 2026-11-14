"""Payloads shaped like the real data server's, storage internals included.

Taken from `lmwn-assignment-2025-server@0.0.0-beta.1`. Each call returns a fresh
copy, so tests can change fields freely.
"""

import copy

from app.domain.working_hours import DAYS_OF_WEEK

GUIDE_SERVICE = "http://guides.test"
RESTAURANT_SERVICE = "http://restaurants.test"

GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb"
ITEM_IDS = (
    "c77c4d6c-01fa-4e62-8870-563de216a976",
    "a213d622-6649-45b2-9857-ce7f81581256",
    "fed2219f-6dc3-4191-a29d-dd1a15f524ee",
)
RESTAURANT_IDS = (
    "cea893e7-1893-43ed-8890-f404395572d0",
    "07e48699-a280-4e8f-9b77-97b4201ab175",
    "5b8f4a8e-2c1d-4f0a-9a43-1f7f8d0c2b6e",
)

_GUIDE: dict[str, object] = {
    "coverPhoto": {
        "id": "63ce2123-b49a-49cc-bc13-80ed802a7894",
        "smallUrl": "http://localhost:7777/r/854/480/20240902_091058.jpg",
        "largeUrl": "http://localhost:7777/r/1920/1080/20240902_091058.jpg",
    },
    "_id": "6af7de4a0ac903d0ffab54fe",
    "id": GUIDE_ID,
    "title": "10 คาเฟ่ลับ One Bangkok!",
    "socialTitle": "ไม่อยากจะเชื่อ มีร้านคาเฟ่ดี ๆ แบบนี้ห้างดังย่านลุมพินี One Bangkok ด้วย",
    "shortDescription": "รวมคาเฟ่เด็ดที่ One Bangkok",
    "description": "รวมสุดยอดคาเฟ่ลับ ที่จะพาคุณไปหลงทาง เอ้ย! หลงไหล ในกลิ่นกาแฟอันหอมหวน",
    "tags": ["กาแฟ", "คาเฟ่", "กรุงเทพ", "One", "Bangkok"],
    "writeDate": "2024-03-10T12:00:00.000Z",
    "createdAt": "2024-03-10T12:00:00.000Z",
    "updatedAt": "2024-03-10T12:00:00.000Z",
    "items": list(ITEM_IDS),
    "__v": 0,
}


def _photo(n: int) -> dict[str, str]:
    return {
        "id": f"07595a7a-c2cf-4051-8d11-5c558c8e35f{n}",
        "smallUrl": f"http://localhost:7777/r/480/854/20250205_12142{n}.jpg",
        "largeUrl": f"http://localhost:7777/r/1080/1920/20250205_12142{n}.jpg",
        "_id": f"6af7de4a0ac903d0ffab550{n}",
    }


def _hours(
    days: range | tuple[int, ...], open_: str, close: str
) -> list[dict[str, object]]:
    return [
        {
            "day": day,
            "open": open_,
            "close": close,
            "_id": f"6af7de4a0ac903d0ffab55{day:02d}",
        }
        for day in days
    ]


_RESTAURANTS: dict[str, dict[str, object]] = {
    # Rated, with every optional field.
    RESTAURANT_IDS[0]: {
        "_id": "6af7de4a0ac903d0ffab5540",
        "id": RESTAURANT_IDS[0],
        "name": "ONIBUS COFFEE",
        "branch": "One Bangkok",
        "rating": 4.3,
        "numberOfReviews": 6,
        "url": "https://www.wongnai.com/restaurants/onibus-coffee-one-bangkok",
        "address": "ชั้น 1 One Bangkok ลุมพินี ปทุมวัน กรุงเทพมหานคร",
        "lat": 13.7275,
        "lng": 100.5469,
        "phoneNo": "0812345678",
        "categories": ["ร้านกาแฟ/ชา", "เบเกอรี/เค้ก"],
        "line": "@onibuscoffee",
        "instagram": "onibuscoffee_bkk",
        "facebook": "onibuscoffeebkk",
        "workingHours": _hours(DAYS_OF_WEEK, "08:00", "18:00"),
        "official": True,
        "delivery": False,
        "pickup": True,
        "__v": 0,
    },
    # Unrated (0 with 0 reviews), only an Instagram account.
    RESTAURANT_IDS[1]: {
        "_id": "6af7de4a0ac903d0ffab555d",
        "id": RESTAURANT_IDS[1],
        "name": "% Arabica",
        "branch": "One Bangkok",
        "rating": 0,
        "numberOfReviews": 0,
        "url": "https://www.wongnai.com/restaurants/2994091eb-arabica-one-bangkok",
        "address": "-,  ลุมพินี ปทุมวัน กรุงเทพมหานคร",
        "lat": 13.7281616302142,
        "lng": 100.545122344047,
        "phoneNo": "0939164541",
        "categories": ["ร้านกาแฟ/ชา"],
        "instagram": "onibuscoffee_bkk",
        "workingHours": _hours(DAYS_OF_WEEK, "07:00", "21:00"),
        "official": True,
        "delivery": True,
        "pickup": False,
        "__v": 0,
    },
    # No branch and no social accounts; 5 days a week, past midnight on Fridays.
    RESTAURANT_IDS[2]: {
        "_id": "6af7de4a0ac903d0ffab5570",
        "id": RESTAURANT_IDS[2],
        "name": "Night Owl Bar",
        "rating": 3.5,
        "numberOfReviews": 12,
        "url": "https://www.wongnai.com/restaurants/night-owl-bar",
        "address": "ถนนวิทยุ ลุมพินี ปทุมวัน กรุงเทพมหานคร",
        "lat": 13.7301,
        "lng": 100.5455,
        "phoneNo": "021234567",
        "categories": ["บาร์"],
        "workingHours": _hours((1, 2, 3, 4), "17:00", "24:00")
        + _hours((5,), "18:00", "02:00"),
        "official": False,
        "delivery": False,
        "pickup": False,
        "__v": 0,
    },
}


def guide() -> dict[str, object]:
    return copy.deepcopy(_GUIDE)


def guide_item(n: int) -> dict[str, object]:
    return {
        "_id": f"6af7de4a0ac903d0ffab550{n}",
        "id": ITEM_IDS[n],
        "description": f"ร้านลับที่ {n + 1} ซ่อนตัวอยู่ที่ไหนก็ไม่รู้",
        "restaurantId": RESTAURANT_IDS[n],
        "photos": [_photo(n), _photo(n + 5)],
        "__v": 0,
    }


def restaurant(n: int) -> dict[str, object]:
    return copy.deepcopy(_RESTAURANTS[RESTAURANT_IDS[n]])
