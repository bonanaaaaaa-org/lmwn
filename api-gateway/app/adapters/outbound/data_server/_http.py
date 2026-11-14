"""One GET against the data server, with every failure translated to an application error."""

import logging
from urllib.parse import quote

import httpx

from app.application.errors import (
    NotFound,
    SourceTimeout,
    SourceUnavailable,
)

logger = logging.getLogger(__name__)


def resource_url(base_url: str, collection: str, record_id: str) -> str:
    """`{base_url}/{collection}/{record_id}` with the ID percent-encoded.

    IDs come from upstream payloads, so `/`, `?`, `#` and `..` must not change
    which path is requested.
    """
    return f"{base_url.rstrip('/')}/{collection}/{quote(record_id, safe='')}"


async def get_record(
    client: httpx.AsyncClient,
    url: str,
    *,
    not_found: NotFound,
) -> bytes:
    """GET `url` and return the body of a record that exists.

    Raises `not_found` when upstream answers 404 or a `null` body, SourceTimeout,
    or SourceUnavailable for transport errors and any other non-200 status.
    Logs the status and URL, never the body.
    """
    try:
        response = await client.get(url)
    except httpx.TimeoutException as timeout:
        logger.warning("Upstream timeout: GET %s", url)
        raise SourceTimeout("upstream timed out") from timeout
    except httpx.RequestError as error:
        # Transport errors, and decoding errors such as a broken gzip body.
        logger.warning("Upstream unreachable: GET %s (%s)", url, type(error).__name__)
        raise SourceUnavailable("upstream unreachable") from error
    if response.status_code == httpx.codes.NOT_FOUND:
        raise not_found
    if response.status_code != httpx.codes.OK:
        logger.warning("Upstream status %s: GET %s", response.status_code, url)
        raise SourceUnavailable(f"upstream answered {response.status_code}")
    if response.content.strip() == b"null":
        # The data server answers an unknown ID with 200 and a `null` body.
        raise not_found
    return response.content
