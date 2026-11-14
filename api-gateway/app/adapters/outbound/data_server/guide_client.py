"""GuideSource over the data server's guide service (:8888)."""

import logging

import httpx
from pydantic import ValidationError

from app.adapters.outbound.data_server._http import get_record, resource_url
from app.adapters.outbound.data_server.payloads import GuideItemPayload, GuidePayload
from app.application.errors import GuideItemNotFound, GuideNotFound, InvalidSourceData
from app.application.ports.guide_source import GuideSource
from app.domain.guide import Guide, GuideItem

logger = logging.getLogger(__name__)


class _DataServerGuideSource:
    def __init__(self, client: httpx.AsyncClient, base_url: str) -> None:
        self._client = client
        self._base_url = base_url

    async def get_guide(self, guide_id: str) -> Guide:
        url = resource_url(self._base_url, "guides", guide_id)
        body = await get_record(self._client, url, not_found=GuideNotFound(guide_id))
        try:
            return GuidePayload.model_validate_json(body).to_domain()
        except ValidationError as invalid:
            logger.warning(
                "Invalid Guide payload: GET %s (%d errors)", url, invalid.error_count()
            )
            raise InvalidSourceData("invalid Guide payload") from invalid

    async def get_guide_item(self, item_id: str) -> GuideItem:
        url = resource_url(self._base_url, "guide-items", item_id)
        body = await get_record(self._client, url, not_found=GuideItemNotFound(item_id))
        try:
            return GuideItemPayload.model_validate_json(body).to_domain()
        except ValidationError as invalid:
            logger.warning(
                "Invalid Guide Item payload: GET %s (%d errors)",
                url,
                invalid.error_count(),
            )
            raise InvalidSourceData("invalid Guide Item payload") from invalid


def create_guide_source(client: httpx.AsyncClient, base_url: str) -> GuideSource:
    return _DataServerGuideSource(client, base_url)
