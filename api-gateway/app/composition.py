"""Composition root: settings and shared resources -> outbound adapters -> use cases.

The only module that knows which adapter implements which port.
"""

import httpx

from app.settings import Settings


def create_http_client(settings: Settings) -> httpx.AsyncClient:
    """One pooled client shared by every outbound data-server adapter."""
    return httpx.AsyncClient(timeout=settings.upstream_timeout_seconds)
