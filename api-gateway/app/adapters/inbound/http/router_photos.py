"""Photos: GET /photos/r/{width}/{height}/{file}, a proxy of the image service.

Browsers can't reach the image service in production, so photo URLs point here
when `PUBLIC_BASE_URL` is set. The image service joins `file` into a filesystem
path, so only a plain image file name is ever forwarded. Each size costs the
sidecar a resize, so only the sizes the data server's photos use are served.
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

# (width, height) of the small and large photo URLs the data server returns, in
# portrait and landscape.
ALLOWED_SIZES = frozenset({(480, 854), (854, 480), (1080, 1920), (1920, 1080)})
_DIMENSION = re.compile(r"[1-9][0-9]{0,3}")
_FILE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpg|jpeg|png|webp)", re.IGNORECASE)

_PHOTO_HEADERS = {
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
}


def _size(width: str, height: str) -> tuple[int, int] | None:
    if _DIMENSION.fullmatch(width) is None or _DIMENSION.fullmatch(height) is None:
        return None
    size = (int(width), int(height))
    return size if size in ALLOWED_SIZES else None


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
                "Unknown photo, a size the data server doesn't use, or a file that"
                " isn't a plain .jpg, .jpeg, .png or .webp name"
            ),
        },
        502: {"model": ErrorResponse, "description": "An upstream error"},
        504: {"model": ErrorResponse, "description": "An upstream service timed out"},
    },
)
async def get_photo(
    width: Annotated[str, Path(description="Width in pixels: 480, 854, 1080 or 1920.")],
    height: Annotated[
        str,
        Path(
            description="Height in pixels, paired with the width: 854, 480, 1920 or 1080."
        ),
    ],
    file: Annotated[str, Path(description="The image's file name, e.g. `x.jpg`.")],
    photo_source: Annotated[PhotoSource, Depends(get_photo_source)],
) -> Response:
    """Served under the gateway's origin with a media type from the file extension."""
    size, valid_file = _size(width, height), _file(file)
    if size is None or valid_file is None:
        # A rejected request never reaches upstream.
        return not_found(PHOTO_NOT_FOUND)
    photo = await photo_source.get_photo(*size, valid_file)
    return Response(
        content=photo.content, media_type=photo.media_type, headers=_PHOTO_HEADERS
    )
