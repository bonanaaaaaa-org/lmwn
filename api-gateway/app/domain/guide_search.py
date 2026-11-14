"""Searching the Guide Index: search text and Tags a Guide must match."""

import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass

from app.domain.guide import Guide


def _nfc(value: str) -> str:
    return unicodedata.normalize("NFC", value)


def _searchable(value: str) -> str:
    """NFC, case-folded: so "Café", "cafe\\u0301" and "CAFÉ" compare equal, and Thai
    combining marks typed in a different order compare equal too."""
    return _nfc(_nfc(value).casefold())


@dataclass(frozen=True, slots=True)
class GuideQuery:
    """Which Guides a diner is looking for. Build it with `GuideQuery.create`.

    A Guide matches when its title, shortDescription or one of its Tags contains
    `text` as plain text, ignoring case (never as a pattern), AND it has every one of
    `tags` exactly. Empty text and no tags match every Guide.
    """

    text: str
    tags: frozenset[str]

    @classmethod
    def create(cls, *, text: str = "", tags: Iterable[str] = ()) -> GuideQuery:
        """Trims and normalises `text`; whitespace-only text matches everything."""
        return cls(text=_searchable(text.strip()), tags=frozenset(map(_nfc, tags)))

    def matches(self, guide: Guide) -> bool:
        if not self.tags.issubset(map(_nfc, guide.tags)):
            return False
        if not self.text:
            return True
        fields = (guide.title, guide.short_description, *guide.tags)
        return any(self.text in _searchable(field) for field in fields)
