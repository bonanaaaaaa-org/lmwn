"""Port: where Guides and Guide Items come from."""

from typing import Protocol

from app.domain.guide import Guide, GuideItem


class GuideSource(Protocol):
    """Reads Guides and Guide Items from the guide service.

    Contract for implementations:
    - list_guide_ids returns every Guide's ID in upstream order.
    - get_guide raises GuideNotFound, and get_guide_item GuideItemNotFound, when the
      record does not exist.
    - Technical failures raise SourceUnavailable (connection error or server error),
      SourceTimeout, or InvalidSourceData (payload failed validation) — never raw
      transport or validation errors.
    - Each call makes at most one upstream request, and may be answered from a
      cache. Only successful reads may be cached: NotFound and technical failures
      are never cached.
    - Returns domain values; callers treat them as immutable.
    """

    async def list_guide_ids(self) -> list[str]: ...

    async def get_guide(self, guide_id: str) -> Guide: ...

    async def get_guide_item(self, item_id: str) -> GuideItem: ...
