"""
FastAPI application entry point.

Run with: uv run uvicorn app.main:app --reload --port 4000
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.http import router_health
from app.composition import create_http_client
from app.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = create_http_client(get_settings())
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
    app.include_router(router_health.router)
    return app


app = create_app()
