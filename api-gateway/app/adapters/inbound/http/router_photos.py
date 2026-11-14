"""Photos: GET /photos/r/{width}/{height}/{file}, a proxy of the image service.

Browsers can't reach the image service in production, so photo URLs point here
when `PUBLIC_BASE_URL` is set. The image service joins `file` into a filesystem
path, so only a plain image file name at a bounded size is ever forwarded.
"""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Path
from fastapi.responses import Response

from app.adapters.inbound.http.dependencies import get_photo_source
from app.adapters.inbound.http.errors import PHOTO_NOT_FOUND, not_found
from app.adapters.inbound.http.schemas import ErrorResponse
from app.application.ports.photo_source import PhotoSource

router = APIRouter(tags=["photos"])

MAX_DIMENSION = 2048
_DIMENSION = re.compile(r"[1-9][0-9]{0,3}")
_FILE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpg|jpeg|png|webp)", re.IGNORECASE)

_PHOTO_HEADERS = {
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
}


def _dimension(value: str) -> int | None:
    if _DIMENSION.fullmatch(value) is None:
        return None
    number = int(value)
    return number if number <= MAX_DIMENSION else None


def _file(value: str) -> str | None:
    if _FILE.fullmatch(value) is None or ".." in value:
        return None
    return value


@router.get(
    # `:path` so a decoded `/` in `file` reaches the check below (and gets its 404
    # body) instead of falling through to the default 404.
    "/photos/r/{width}/{height}/{file:path}",
    response_class=Response,
    summary="A photo, resized by the image service",
    responses={
        200: {
            "description": "The image, cacheable for a day",
            "content": {"image/jpeg": {}, "image/png": {}, "image/webp": {}},
        },
        404: {
            "model": ErrorResponse,
            "description": (
                "Unknown photo, a size outside 1-2048, or a file that isn't a plain"
                " .jpg, .jpeg, .png or .webp name"
            ),
        },
        502: {"model": ErrorResponse, "description": "An upstream error"},
        504: {"model": ErrorResponse, "description": "An upstream service timed out"},
    },
)
async def get_photo(
    width: Annotated[str, Path(description="Width in pixels, 1-2048.")],
    height: Annotated[str, Path(description="Height in pixels, 1-2048.")],
    file: Annotated[str, Path(description="The image's file name, e.g. `x.jpg`.")],
    photo_source: Annotated[PhotoSource, Depends(get_photo_source)],
) -> Response:
    """Served under the gateway's origin with a media type from the file extension."""
    valid_width, valid_height, valid_file = (
        _dimension(width),
        _dimension(height),
        _file(file),
    )
    if valid_width is None or valid_height is None or valid_file is None:
        # A rejected request never reaches upstream.
        return not_found(PHOTO_NOT_FOUND)
    photo = await photo_source.get_photo(valid_width, valid_height, valid_file)
    return Response(
        content=photo.content, media_type=photo.media_type, headers=_PHOTO_HEADERS
    )
