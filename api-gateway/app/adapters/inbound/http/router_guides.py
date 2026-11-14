"""Guides: GET /guides and GET /guides/{guideId}."""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import JSONResponse

from app.adapters.inbound.http.dependencies import (
    get_guide_detail_use_case,
    get_list_guides_use_case,
)
from app.adapters.inbound.http.errors import not_found
from app.adapters.inbound.http.schemas import (
    ErrorResponse,
    GuideDetailResponse,
    GuideListResponse,
)
from app.application.get_guide_detail import GetGuideDetail
from app.application.list_guides import ListGuides
from app.domain.guide_search import GuideQuery

router = APIRouter(tags=["guides"])

_UUID = re.compile(r"[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}")

_UPSTREAM_ERRORS: dict[int | str, dict[str, object]] = {
    502: {
        "model": ErrorResponse,
        "description": "An upstream error or invalid upstream data",
    },
    504: {"model": ErrorResponse, "description": "An upstream service timed out"},
}

MAX_QUERY_LENGTH = 100


@router.get(
    "/guides",
    response_model=GuideListResponse,
    summary="The Guide Index: Guide summaries, narrowed by search text and Tags",
    responses={
        422: {
            "model": ErrorResponse,
            "description": "`q` is longer than 100 characters",
        },
        **_UPSTREAM_ERRORS,
    },
)
async def list_guides(
    use_case: Annotated[ListGuides, Depends(get_list_guides_use_case)],
    q: Annotated[
        str,
        Query(
            max_length=MAX_QUERY_LENGTH,
            description=(
                "Plain text (not a pattern) that the title, shortDescription or a Tag"
                " must contain, ignoring case. Trimmed and NFC-normalised; empty"
                " matches every Guide. At most 100 characters as sent, before"
                " trimming."
            ),
        ),
    ] = "",
    tag: Annotated[
        list[str],
        Query(
            description="A Tag the Guide must have, exactly. Repeat to require several."
        ),
    ] = [],  # noqa: B006 - FastAPI copies query defaults per request.
) -> GuideListResponse:
    """Text and Tags combine with AND. Guides come in upstream order."""
    return GuideListResponse.from_domain(
        await use_case(GuideQuery.create(text=q, tags=tag))
    )


@router.get(
    "/guides/{guideId}",
    response_model=GuideDetailResponse,
    summary="A Guide with every Guide Item and its Restaurant",
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Unknown Guide, or an ID that isn't a UUID",
        },
        **_UPSTREAM_ERRORS,
    },
)
async def get_guide(
    guide_id: Annotated[str, Path(alias="guideId", description="The Guide's UUID.")],
    get_guide_detail: Annotated[GetGuideDetail, Depends(get_guide_detail_use_case)],
) -> GuideDetailResponse | JSONResponse:
    """Guide Items come in the editor's order. A Guide Item whose Restaurant couldn't
    be loaded is still returned, with `restaurant: null` (an Unavailable Restaurant).
    """
    if _UUID.fullmatch(guide_id) is None:
        # A malformed ID never reaches upstream.
        return not_found()
    return GuideDetailResponse.from_domain(await get_guide_detail(guide_id))
