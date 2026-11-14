"""GuideSource and RestaurantSource decorators that cache upstream reads in memory.

The composition root wraps the data-server adapters with these, so repeat reads
within the TTL never reach upstream. Only successful reads are stored: NotFound
and technical failures go to the caller and the next call asks upstream again.
"""

import time

from app.adapters.outbound.cache.ttl_cache import Clock, TtlCache
from app.application.ports.guide_source import GuideSource
from app.application.ports.restaurant_source import RestaurantSource
from app.domain.guide import Guide, GuideItem
from app.domain.restaurant import Restaurant


class _CachingGuideSource:
    def __init__(self, source: GuideSource, ttl_seconds: float, clock: Clock) -> None:
        self._source = source
        self._guide_ids: TtlCache[None, tuple[str, ...]] = TtlCache(
            ttl_seconds=ttl_seconds, clock=clock
        )
        self._guides: TtlCache[str, Guide] = TtlCache(
            ttl_seconds=ttl_seconds, clock=clock
        )
        self._items: TtlCache[str, GuideItem] = TtlCache(
            ttl_seconds=ttl_seconds, clock=clock
        )

    async def list_guide_ids(self) -> list[str]:
        async def load() -> tuple[str, ...]:
            return tuple(await self._source.list_guide_ids())

        # Stored as a tuple and copied out, so a caller can't change the cache.
        return list(await self._guide_ids.get_or_load(None, load))

    async def get_guide(self, guide_id: str) -> Guide:
        return await self._guides.get_or_load(
            guide_id, lambda: self._source.get_guide(guide_id)
        )

    async def get_guide_item(self, item_id: str) -> GuideItem:
        return await self._items.get_or_load(
            item_id, lambda: self._source.get_guide_item(item_id)
        )


class _CachingRestaurantSource:
    def __init__(
        self, source: RestaurantSource, ttl_seconds: float, clock: Clock
    ) -> None:
        self._source = source
        self._restaurants: TtlCache[str, Restaurant] = TtlCache(
            ttl_seconds=ttl_seconds, clock=clock
        )

    async def get_restaurant(self, restaurant_id: str) -> Restaurant:
        return await self._restaurants.get_or_load(
            restaurant_id, lambda: self._source.get_restaurant(restaurant_id)
        )


def cache_guide_source(
    source: GuideSource, *, ttl_seconds: float, clock: Clock = time.monotonic
) -> GuideSource:
    """`source`, with each successful read remembered for `ttl_seconds`."""
    return _CachingGuideSource(source, ttl_seconds, clock)


def cache_restaurant_source(
    source: RestaurantSource, *, ttl_seconds: float, clock: Clock = time.monotonic
) -> RestaurantSource:
    """`source`, with each successful read remembered for `ttl_seconds`."""
    return _CachingRestaurantSource(source, ttl_seconds, clock)
