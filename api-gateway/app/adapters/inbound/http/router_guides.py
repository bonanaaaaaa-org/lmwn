"""Guides: GET /guides/{guideId}."""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Path
from fastapi.responses import JSONResponse

from app.adapters.inbound.http.dependencies import get_guide_detail_use_case
from app.adapters.inbound.http.errors import not_found
from app.adapters.inbound.http.schemas import ErrorResponse, GuideDetailResponse
from app.application.get_guide_detail import GetGuideDetail

router = APIRouter(tags=["guides"])

_UUID = re.compile(r"[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}")


@router.get(
    "/guides/{guideId}",
    response_model=GuideDetailResponse,
    summary="A Guide with every Guide Item and its Restaurant",
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Unknown Guide, or an ID that isn't a UUID",
        },
        502: {
            "model": ErrorResponse,
            "description": "An upstream error or invalid upstream data",
        },
        504: {"model": ErrorResponse, "description": "An upstream service timed out"},
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
