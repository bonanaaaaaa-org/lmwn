"""PhotoSource over the data server's image service (:7777, `/r/:width/:height/:file`)."""

from pathlib import PurePosixPath
from urllib.parse import quote

import httpx

from app.adapters.outbound.data_server._http import collection_url, get_record
from app.application.errors import PhotoNotFound
from app.application.ports.photo_source import PhotoImage, PhotoSource

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


class _DataServerPhotoSource:
    def __init__(self, client: httpx.AsyncClient, base_url: str) -> None:
        self._client = client
        self._base_url = base_url

    async def get_photo(self, width: int, height: int, file: str) -> PhotoImage:
        # The image service joins `file` into a filesystem path and decodes `%2F`:
        # quoting keeps any `/` or `..` that slipped past the caller inside one segment.
        url = (
            f"{collection_url(self._base_url, 'r')}/{width}/{height}/"
            f"{quote(file, safe='')}"
        )
        content = await get_record(self._client, url, not_found=PhotoNotFound(file))
        if not content:
            # A missing image is answered with 200 and an empty body.
            raise PhotoNotFound(file)
        media_type = _MEDIA_TYPES.get(
            PurePosixPath(file).suffix.lower(), "application/octet-stream"
        )
        return PhotoImage(content=content, media_type=media_type)


def create_photo_source(client: httpx.AsyncClient, base_url: str) -> PhotoSource:
    return _DataServerPhotoSource(client, base_url)
