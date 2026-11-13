import httpx

from app.main import app, lifespan


async def test_lifespan_opens_and_closes_shared_http_client() -> None:
    async with lifespan(app):
        client = app.state.http_client
        assert isinstance(client, httpx.AsyncClient)
        assert not client.is_closed

    assert client.is_closed
