"""
FastAPI application entry point.

Run with: uv run uvicorn app.main:app --reload --port 4000
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.http import router_guides, router_health, router_photos
from app.adapters.inbound.http.errors import register_error_handlers
from app.composition import (
    create_http_client,
    create_photo_source,
    create_use_cases,
)
from app.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.http_client = create_http_client(settings)
    app.state.use_cases = create_use_cases(settings, app.state.http_client)
    app.state.photo_source = create_photo_source(settings, app.state.http_client)
    try:
        yield
    finally:
        await app.state.http_client.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Guide to Hidden Gems API Gateway", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(router_health.router)
    app.include_router(router_guides.router)
    app.include_router(router_photos.router)
    return app


app = create_app()
