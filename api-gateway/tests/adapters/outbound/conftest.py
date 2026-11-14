from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
import respx


@pytest.fixture
def upstream() -> Iterator[respx.MockRouter]:
    with respx.mock(assert_all_called=False) as router:
        yield router


@pytest_asyncio.fixture
async def http_client() -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(timeout=1) as client:
        yield client
