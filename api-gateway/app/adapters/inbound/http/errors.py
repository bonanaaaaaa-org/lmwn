"""Application errors -> HTTP responses with a safe `{detail}` body."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.errors import (
    InvalidSourceData,
    NotFound,
    SourceError,
    SourceTimeout,
    SourceUnavailable,
)

GUIDE_NOT_FOUND = "Guide not found"

_RESPONSES: tuple[tuple[type[SourceError], int, str], ...] = (
    (NotFound, 404, GUIDE_NOT_FOUND),
    (SourceTimeout, 504, "An upstream service timed out"),
    (SourceUnavailable, 502, "An upstream service is unavailable"),
    (InvalidSourceData, 502, "An upstream service returned invalid data"),
)


def not_found() -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": GUIDE_NOT_FOUND})


async def _source_error(_request: Request, error: Exception) -> JSONResponse:
    # The detail is fixed per error type: exception text can quote upstream URLs or values.
    for error_type, status_code, detail in _RESPONSES:
        if isinstance(error, error_type):
            return JSONResponse(status_code=status_code, content={"detail": detail})
    return JSONResponse(
        status_code=502, content={"detail": "An upstream service failed"}
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(SourceError, _source_error)
