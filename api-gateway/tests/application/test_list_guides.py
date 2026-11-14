import asyncio
import dataclasses

import pytest

from app.application.errors import (
    InvalidSourceData,
    SourceError,
    SourceTimeout,
    SourceUnavailable,
)
from app.application.list_guides import create_list_guides
from app.domain.guide import Guide
from app.domain.guide_search import GuideQuery
from tests.builders import a_guide
from tests.fakes import FakeGuideSource

EVERYTHING = GuideQuery.create()


def guide(guide_id: str, title: str = "Guide", tags: tuple[str, ...] = ()) -> Guide:
    return dataclasses.replace(
        a_guide(guide_id, ["item-1"]), title=title, short_description="", tags=tags
    )


def source_of(*guides: Guide, **kwargs: object) -> FakeGuideSource:
    return FakeGuideSource(
        guide_ids=[g.id for g in guides],
        guides={g.id: g for g in guides},
        **kwargs,  # pyrefly: ignore[bad-argument-type]
    )


async def test_lists_every_guide_in_upstream_order() -> None:
    guides = [guide(f"guide-{n}") for n in range(5)]
    source = source_of(*guides, delays={"guide-0": 0.02, "guide-3": 0.01})

    result = await create_list_guides(guide_source=source)(EVERYTHING)

    assert result == guides


async def test_lists_only_guides_matching_the_query() -> None:
    cafe = guide("guide-cafe", title="10 คาเฟ่ลับ", tags=("กาแฟ",))
    bar = guide("guide-bar", title="บาร์ลับ", tags=("กาแฟ",))
    other = guide("guide-other", title="คาเฟ่ใหม่", tags=("ขนม",))
    list_guides = create_list_guides(guide_source=source_of(cafe, bar, other))

    assert await list_guides(GuideQuery.create(text="คาเฟ่", tags=["กาแฟ"])) == [cafe]


async def test_no_guides_upstream_is_an_empty_list() -> None:
    assert await create_list_guides(guide_source=source_of())(EVERYTHING) == []


async def test_keeps_at_most_max_concurrency_requests_in_flight() -> None:
    source = source_of(*(guide(f"guide-{n}") for n in range(20)), delay=0.005)

    await create_list_guides(guide_source=source, max_concurrency=3)(EVERYTHING)

    assert source.in_flight.peak == 3


@pytest.mark.parametrize(
    "failure", [SourceTimeout("t"), SourceUnavailable("u"), InvalidSourceData("i")]
)
async def test_a_failing_guide_fails_the_whole_list(failure: SourceError) -> None:
    source = source_of(guide("guide-1"), guide("guide-2"))
    source.failures["guide-2"] = failure

    with pytest.raises(type(failure)):
        await create_list_guides(guide_source=source)(EVERYTHING)


async def test_failing_to_list_guide_ids_fails_the_list() -> None:
    source = source_of(guide("guide-1"))
    source.failures[FakeGuideSource.LIST] = SourceUnavailable("u")

    with pytest.raises(SourceUnavailable):
        await create_list_guides(guide_source=source)(EVERYTHING)


async def test_a_listed_guide_the_source_does_not_have_is_invalid_source_data() -> None:
    # Not GuideNotFound: that would turn the Guide Index into a 404.
    source = source_of(guide("guide-1"))
    source.guide_ids.append("guide-missing")

    with pytest.raises(InvalidSourceData):
        await create_list_guides(guide_source=source)(EVERYTHING)


async def test_a_failing_guide_cancels_the_guides_still_loading() -> None:
    guides = [guide(f"guide-{n}") for n in range(10)]
    source = source_of(*guides, delays={g.id: 1 for g in guides[1:]})
    source.failures["guide-0"] = SourceTimeout("t")
    list_guides = create_list_guides(guide_source=source, max_concurrency=4)

    with pytest.raises(SourceTimeout):
        await asyncio.wait_for(list_guides(EVERYTHING), timeout=0.5)

    assert source.in_flight.now == 0
    assert len(source.in_flight.calls) < 1 + len(guides)
