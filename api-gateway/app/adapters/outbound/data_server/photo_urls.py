"""Photo URLs as the browser should see them.

Upstream payloads point photos at the image service (`http://localhost:7777/r/...`),
which browsers can't reach in production. With a public base URL, those URLs are
rewritten to the gateway's own `/photos` route, which proxies the image service.
"""

from collections.abc import Callable
from urllib.parse import urlsplit

type PhotoUrl = Callable[[str], str]
"""Turns an upstream photo URL into the URL the web app receives."""

# Must match the gateway's inbound photo route (router_photos.py).
PUBLIC_PHOTOS_PATH = "/photos"


def keep_photo_url(url: str) -> str:
    """Passes the URL through unchanged (local development)."""
    return url


def _origin(url: str) -> tuple[str, str, int | None] | None:
    try:
        parts = urlsplit(url)
        scheme = parts.scheme.lower()
        port = parts.port or {"http": 80, "https": 443}.get(scheme)
    except ValueError:
        return None
    return (scheme, (parts.hostname or "").lower(), port)


def create_photo_url(photo_service_url: str, public_base_url: str | None) -> PhotoUrl:
    """The rewrite for these settings: identity when `public_base_url` is None.

    A URL on the photo service's origin with a `/r/...` path becomes
    `{public_base_url}/photos/r/...`; any other URL is left unchanged.
    """
    if public_base_url is None:
        return keep_photo_url
    service_origin = _origin(photo_service_url)
    public_photos = public_base_url.rstrip("/") + PUBLIC_PHOTOS_PATH

    def photo_url(url: str) -> str:
        if _origin(url) != service_origin:
            return url
        path = urlsplit(url).path
        if not path.startswith("/r/"):
            return url
        return public_photos + path

    return photo_url
