"""RestaurantSource over the data server's restaurant service (:9999)."""

import logging

import httpx
from pydantic import ValidationError

from app.adapters.outbound.data_server._http import get_record, resource_url
from app.adapters.outbound.data_server.payloads import RestaurantPayload
from app.application.errors import InvalidSourceData, RestaurantNotFound
from app.application.ports.restaurant_source import RestaurantSource
from app.domain.errors import DomainError
from app.domain.restaurant import Restaurant

logger = logging.getLogger(__name__)


class _DataServerRestaurantSource:
    def __init__(self, client: httpx.AsyncClient, base_url: str) -> None:
        self._client = client
        self._base_url = base_url

    async def get_restaurant(self, restaurant_id: str) -> Restaurant:
        url = resource_url(self._base_url, "restaurants", restaurant_id)
        body = await get_record(
            self._client, url, not_found=RestaurantNotFound(restaurant_id)
        )
        try:
            return RestaurantPayload.model_validate_json(body).to_domain()
        except ValidationError as invalid:
            logger.warning(
                "Invalid Restaurant payload: GET %s (%d errors)",
                url,
                invalid.error_count(),
            )
            raise InvalidSourceData("invalid Restaurant payload") from invalid
        except DomainError as broken:
            # The message quotes the raw upstream value: log it, never return it.
            logger.warning("Restaurant breaks a domain rule: GET %s (%s)", url, broken)
            raise InvalidSourceData("Restaurant breaks a domain rule") from broken


def create_restaurant_source(
    client: httpx.AsyncClient, base_url: str
) -> RestaurantSource:
    return _DataServerRestaurantSource(client, base_url)
