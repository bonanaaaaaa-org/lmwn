"""Port: where Guides and Guide Items come from."""

from typing import Protocol

from app.domain.guide import Guide, GuideItem


class GuideSource(Protocol):
    """Reads Guides and Guide Items from the guide service.

    Contract for implementations:
    - get_guide raises GuideNotFound, and get_guide_item GuideItemNotFound, when the
      record does not exist.
    - Technical failures raise SourceUnavailable (connection error or server error),
      SourceTimeout, or InvalidSourceData (payload failed validation) — never raw
      transport or validation errors.
    - Each call makes at most one upstream request and does not cache.
    - Returns domain values; callers treat them as immutable.
    """

    async def get_guide(self, guide_id: str) -> Guide: ...

    async def get_guide_item(self, item_id: str) -> GuideItem: ...
