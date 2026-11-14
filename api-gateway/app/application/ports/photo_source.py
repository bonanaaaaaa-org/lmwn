"""Port: where photo images come from."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class PhotoImage:
    """An image's bytes and the media type to serve them as."""

    content: bytes
    media_type: str


class PhotoSource(Protocol):
    """Reads resized images from the photo service.

    Contract for implementations:
    - Callers pass a validated size and a plain file name (no `/`, no `..`, a known
      image extension); implementations still percent-encode the file name.
    - get_photo raises PhotoNotFound when the image does not exist, including an
      empty answer.
    - The media type follows the file's extension, not what upstream claims.
    - Technical failures raise SourceUnavailable or SourceTimeout — never raw
      transport errors.
    - Each call makes at most one upstream request and does not cache.
    """

    async def get_photo(self, width: int, height: int, file: str) -> PhotoImage: ...
