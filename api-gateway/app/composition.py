"""Composition root: settings and shared resources -> outbound adapters -> use cases.

The only module that knows which adapter implements which port.
"""

import time
from dataclasses import dataclass

import httpx

from app.adapters.outbound.cache.caching_sources import (
    cache_guide_source,
    cache_restaurant_source,
)
from app.adapters.outbound.cache.ttl_cache import Clock
from app.adapters.outbound.data_server.guide_client import create_guide_source
from app.adapters.outbound.data_server.restaurant_client import create_restaurant_source
from app.application.get_guide_detail import GetGuideDetail, create_get_guide_detail
from app.application.list_guides import ListGuides, create_list_guides
from app.settings import Settings


def create_http_client(settings: Settings) -> httpx.AsyncClient:
    """One pooled client shared by every outbound data-server adapter."""
    return httpx.AsyncClient(timeout=settings.upstream_timeout_seconds)


@dataclass(frozen=True, slots=True)
class UseCases:
    get_guide_detail: GetGuideDetail
    list_guides: ListGuides


def create_use_cases(
    settings: Settings, client: httpx.AsyncClient, *, clock: Clock = time.monotonic
) -> UseCases:
    """Use cases over the data server, with upstream reads cached in memory for
    `settings.cache_ttl_seconds` (measured on `clock`) and shared between them.
    """
    guide_source = cache_guide_source(
        create_guide_source(client, str(settings.guide_service_url)),
        ttl_seconds=settings.cache_ttl_seconds,
        clock=clock,
    )
    restaurant_source = cache_restaurant_source(
        create_restaurant_source(client, str(settings.restaurant_service_url)),
        ttl_seconds=settings.cache_ttl_seconds,
        clock=clock,
    )
    return UseCases(
        get_guide_detail=create_get_guide_detail(
            guide_source=guide_source, restaurant_source=restaurant_source
        ),
        list_guides=create_list_guides(guide_source=guide_source),
    )
