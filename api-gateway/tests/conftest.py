from collections.abc import AsyncIterator

import allure
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture(autouse=True)
def _allure_metadata(request: pytest.FixtureRequest) -> None:
    """Labels and identifies gateway tests in the combined Allure report (`pnpm allure`)."""
    allure.dynamic.label("layer", "API gateway (pytest)")
    # Allure tells parametrized cases apart by their parameters' repr, and some reprs repeat
    # (`<Response [200 OK]>` for different responses). pytest's case id is unique: a hidden
    # parameter keeps those cases from being merged into one test with retries.
    callspec = getattr(request.node, "callspec", None)
    if callspec is not None:
        allure.dynamic.parameter("case", callspec.id, mode=allure.parameter_mode.HIDDEN)
