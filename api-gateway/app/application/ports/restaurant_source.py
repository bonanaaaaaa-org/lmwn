"""Port: where Restaurants come from."""

from typing import Protocol

from app.domain.restaurant import Restaurant


class RestaurantSource(Protocol):
    """Reads Restaurants from the restaurant service.

    Contract for implementations:
    - get_restaurant raises RestaurantNotFound when the Restaurant does not exist.
    - Technical failures raise SourceUnavailable, SourceTimeout, or InvalidSourceData
      (payload failed validation, or broke a domain rule such as malformed Working
      Hours) — never raw transport, validation or domain errors.
    - Each call makes at most one upstream request, and may be answered from a
      cache. Only successful reads may be cached: NotFound and technical failures
      are never cached.
    """

    async def get_restaurant(self, restaurant_id: str) -> Restaurant: ...
