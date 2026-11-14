"""Application errors: what went wrong reading the upstream sources.

Outbound adapters raise them; the HTTP adapter maps them to responses.
"""


class SourceError(Exception):
    """An upstream source could not provide what was asked for."""


class NotFound(SourceError):
    """The upstream source has no such record (it answered `null` or 404)."""


class GuideNotFound(NotFound):
    """No Guide has this ID."""


class GuideItemNotFound(NotFound):
    """No Guide Item has this ID."""


class RestaurantNotFound(NotFound):
    """No Restaurant has this ID."""


class PhotoNotFound(NotFound):
    """The photo service has no such image (it answered 404 or an empty body)."""


class SourceUnavailable(SourceError):
    """The source could not be reached, or answered with a server error."""


class SourceTimeout(SourceError):
    """The source did not answer in time."""


class InvalidSourceData(SourceError):
    """The source answered with data that breaks its contract or a domain rule."""
