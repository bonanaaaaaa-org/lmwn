"""Guides and Guide Items as editors wrote them."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class Photo:
    """One image, at a small and a large size."""

    id: str
    small_url: str
    large_url: str


@dataclass(frozen=True, slots=True)
class Guide:
    """An editor-written, themed collection of Restaurants.

    `item_ids` lists its Guide Items in the editor's order.
    """

    id: str
    title: str
    social_title: str
    short_description: str
    description: str
    cover_photo: Photo
    tags: tuple[str, ...]
    write_date: datetime
    item_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class GuideItem:
    """One Restaurant's appearance in a Guide: the editor's write-up and photos."""

    id: str
    description: str
    restaurant_id: str
    photos: tuple[Photo, ...]
