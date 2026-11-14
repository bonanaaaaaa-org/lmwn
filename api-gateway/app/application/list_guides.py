"""Use case: the Guide Index, narrowed by search text and Tags."""

import asyncio
from collections.abc import Awaitable, Callable

from app.application.errors import GuideNotFound, InvalidSourceData
from app.application.ports.guide_source import GuideSource
from app.domain.guide import Guide
from app.domain.guide_search import GuideQuery

MAX_CONCURRENCY = 8
"""Most upstream requests the Guide Index may have in flight at once."""


type ListGuides = Callable[[GuideQuery], Awaitable[list[Guide]]]
"""Returns every Guide matching the query, in upstream order.

The upstream can't search, so every Guide is loaded (at most `max_concurrency`
requests in flight) and filtered here. Any failing Guide fails the whole call: it
raises SourceTimeout, SourceUnavailable or InvalidSourceData (a Guide the source
lists but does not have is InvalidSourceData, not a missing Guide).
"""


def create_list_guides(
    *, guide_source: GuideSource, max_concurrency: int = MAX_CONCURRENCY
) -> ListGuides:
    async def list_guides(query: GuideQuery) -> list[Guide]:
        limit = asyncio.Semaphore(max_concurrency)

        async def load_guide(guide_id: str) -> Guide:
            async with limit:
                try:
                    return await guide_source.get_guide(guide_id)
                except GuideNotFound as missing:
                    raise InvalidSourceData(
                        "the source lists a Guide it does not have"
                    ) from missing

        guide_ids = await guide_source.list_guide_ids()
        try:
            async with asyncio.TaskGroup() as group:
                tasks = [group.create_task(load_guide(i)) for i in guide_ids]
        except ExceptionGroup as failed:
            # The first failing Guide fails the Guide Index; the rest were cancelled.
            first = failed.exceptions[0]
            raise first from first.__cause__
        guides = (task.result() for task in tasks)
        return [guide for guide in guides if query.matches(guide)]

    return list_guides
