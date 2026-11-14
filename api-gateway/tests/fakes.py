"""In-memory GuideSource and RestaurantSource, seeded per test.

Each fake counts the calls in flight across both sources through a shared
`InFlight` meter, so tests can check the use case's concurrency bound.
"""

import asyncio
from dataclasses import dataclass, field
from typing import ClassVar

from app.application.errors import GuideItemNotFound, GuideNotFound, RestaurantNotFound
from app.domain.guide import Guide, GuideItem
from app.domain.restaurant import Restaurant


@dataclass
class InFlight:
    now: int = 0
    peak: int = 0
    calls: list[str] = field(default_factory=list)

    async def call(self, name: str, delay: float) -> None:
        self.calls.append(name)
        self.now += 1
        self.peak = max(self.peak, self.now)
        try:
            await asyncio.sleep(delay)
        finally:
            self.now -= 1


@dataclass
class FakeGuideSource:
    LIST: ClassVar[str] = "list"
    """Key in `failures` that makes `list_guide_ids` fail."""

    guide_ids: list[str] = field(default_factory=list)
    """What `list_guide_ids` returns, in upstream order."""
    guides: dict[str, Guide] = field(default_factory=dict)
    items: dict[str, GuideItem] = field(default_factory=dict)
    failures: dict[str, Exception] = field(default_factory=dict)
    in_flight: InFlight = field(default_factory=InFlight)
    delay: float = 0
    delays: dict[str, float] = field(default_factory=dict)
    """Per-ID delays, overriding `delay`, to make calls finish out of order."""

    async def list_guide_ids(self) -> list[str]:
        await self.in_flight.call("guides", self.delay)
        if self.LIST in self.failures:
            raise self.failures[self.LIST]
        return list(self.guide_ids)

    async def get_guide(self, guide_id: str) -> Guide:
        await self.in_flight.call(
            f"guide:{guide_id}", self.delays.get(guide_id, self.delay)
        )
        if guide_id in self.failures:
            raise self.failures[guide_id]
        if guide_id not in self.guides:
            raise GuideNotFound(guide_id)
        return self.guides[guide_id]

    async def get_guide_item(self, item_id: str) -> GuideItem:
        await self.in_flight.call(
            f"item:{item_id}", self.delays.get(item_id, self.delay)
        )
        if item_id in self.failures:
            raise self.failures[item_id]
        if item_id not in self.items:
            raise GuideItemNotFound(item_id)
        return self.items[item_id]


@dataclass
class FakeRestaurantSource:
    restaurants: dict[str, Restaurant] = field(default_factory=dict)
    failures: dict[str, Exception] = field(default_factory=dict)
    in_flight: InFlight = field(default_factory=InFlight)
    delay: float = 0

    async def get_restaurant(self, restaurant_id: str) -> Restaurant:
        await self.in_flight.call(f"restaurant:{restaurant_id}", self.delay)
        if restaurant_id in self.failures:
            raise self.failures[restaurant_id]
        if restaurant_id not in self.restaurants:
            raise RestaurantNotFound(restaurant_id)
        return self.restaurants[restaurant_id]
