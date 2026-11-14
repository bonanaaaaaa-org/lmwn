"""Use case: one Guide with every Guide Item and its Restaurant."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from app.application.errors import GuideItemNotFound, InvalidSourceData, SourceError
from app.application.ports.guide_source import GuideSource
from app.application.ports.restaurant_source import RestaurantSource
from app.domain.guide import Guide, GuideItem
from app.domain.restaurant import Restaurant

logger = logging.getLogger(__name__)

MAX_CONCURRENCY = 8
"""Most upstream requests one Guide may have in flight at once."""


@dataclass(frozen=True, slots=True)
class GuideDetailItem:
    """A Guide Item with its Restaurant, or None for an Unavailable Restaurant."""

    item: GuideItem
    restaurant: Restaurant | None


@dataclass(frozen=True, slots=True)
class GuideDetail:
    guide: Guide
    items: tuple[GuideDetailItem, ...]

    @property
    def has_unavailable_restaurant(self) -> bool:
        return any(entry.restaurant is None for entry in self.items)


type GetGuideDetail = Callable[[str], Awaitable[GuideDetail]]
"""Returns the Guide with each Guide Item and its Restaurant, in guide order.

At most `max_concurrency` upstream requests are in flight per call. A Restaurant
that fails for any upstream reason becomes an Unavailable Restaurant. A failing
Guide or Guide Item fails the whole call: it raises GuideNotFound, SourceTimeout,
SourceUnavailable or InvalidSourceData (a Guide Item the Guide lists but the source
does not have is InvalidSourceData, not a missing Guide).
"""


def create_get_guide_detail(
    *,
    guide_source: GuideSource,
    restaurant_source: RestaurantSource,
    max_concurrency: int = MAX_CONCURRENCY,
) -> GetGuideDetail:
    async def get_guide_detail(guide_id: str) -> GuideDetail:
        limit = asyncio.Semaphore(max_concurrency)

        async def load_item(item_id: str) -> GuideItem:
            async with limit:
                try:
                    return await guide_source.get_guide_item(item_id)
                except GuideItemNotFound as missing:
                    raise InvalidSourceData(
                        "the Guide lists a Guide Item the source does not have"
                    ) from missing

        async def load_restaurant(restaurant_id: str) -> Restaurant | None:
            async with limit:
                try:
                    return await restaurant_source.get_restaurant(restaurant_id)
                except SourceError as error:
                    logger.warning(
                        "Restaurant %s unavailable: %s",
                        restaurant_id,
                        type(error).__name__,
                    )
                    return None

        async def load_entry(item_id: str) -> GuideDetailItem:
            item = await load_item(item_id)
            return GuideDetailItem(item, await load_restaurant(item.restaurant_id))

        async with limit:
            guide = await guide_source.get_guide(guide_id)
        try:
            async with asyncio.TaskGroup() as group:
                tasks = [group.create_task(load_entry(i)) for i in guide.item_ids]
        except ExceptionGroup as failed:
            # The first Guide Item failure fails the Guide; the rest were cancelled.
            first = failed.exceptions[0]
            raise first from first.__cause__
        return GuideDetail(guide, tuple(task.result() for task in tasks))

    return get_guide_detail
