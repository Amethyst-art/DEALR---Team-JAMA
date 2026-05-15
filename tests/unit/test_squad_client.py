from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import pytest
import pytest_asyncio

from app.core.config import Settings
from app.squad.client import SquadClient
from app.squad.errors import SquadBadRequestError, SquadRequeryableError, SquadTransientError


def _make_http_client(
    *,
    status: int,
    json_data: dict[str, object] | None = None,
    text: str = "",
) -> httpx.AsyncClient:
    """Build a real AsyncClient whose transport always returns the given response."""

    def handler(request: httpx.Request) -> httpx.Response:
        if json_data is not None:
            return httpx.Response(status, json=json_data)
        return httpx.Response(status, text=text)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.fixture
def settings() -> Settings:
    return Settings(
        DATABASE_URL="postgresql+asyncpg://localhost/postgres",
        REDIS_URL="redis://localhost:6379/0",
        CELERY_BROKER_URL="redis://localhost:6379/1",
        CELERY_RESULT_BACKEND="redis://localhost:6379/2",
        JWT_SECRET="secret",
        BVN_SALT="salt",
        SHARE_LINK_SECRET="share",
        SQUAD_BASE_URL="https://sandbox-api-d.squadco.com",
        SQUAD_SECRET_KEY="sk_test",
        SQUAD_MERCHANT_ID="MERCHID",
        SQUAD_PUBLIC_KEY="",
        SQUAD_WEBHOOK_ALLOWED_IPS="",
    )


@pytest_asyncio.fixture
async def squad_client_factory(
    settings: Settings,
) -> AsyncIterator[
    "Callable[..., tuple[SquadClient, httpx.AsyncClient]]"  # type: ignore[name-defined]
]:
    """Yield a factory that builds a SquadClient and cleans up the underlying http client."""
    created: list[httpx.AsyncClient] = []

    def factory(
        *, status: int, json_data: dict[str, object] | None = None, text: str = ""
    ) -> SquadClient:
        http_client = _make_http_client(status=status, json_data=json_data, text=text)
        created.append(http_client)
        return SquadClient(http_client=http_client, settings=settings)

    yield factory

    for http_client in created:
        await http_client.aclose()


@pytest.mark.asyncio
async def test_request_success_returns_json(squad_client_factory) -> None:
    client = squad_client_factory(status=200, json_data={"ok": True})

    assert await client._request("GET", "/test") == {"ok": True}


@pytest.mark.asyncio
async def test_send_request_raises_requeryable_for_424(squad_client_factory) -> None:
    client = squad_client_factory(status=424, text="needs requery")

    with pytest.raises(SquadRequeryableError):
        await client._request("POST", "/test")


@pytest.mark.asyncio
async def test_send_request_raises_transient_for_500(squad_client_factory) -> None:
    client = squad_client_factory(status=500, text="server error")

    with pytest.raises(SquadTransientError):
        await client._request("POST", "/test")


@pytest.mark.asyncio
async def test_send_request_maps_400_to_bad_request(squad_client_factory) -> None:
    client = squad_client_factory(status=400, text="bad request")

    with pytest.raises(SquadBadRequestError) as excinfo:
        await client._request("POST", "/test")

    assert excinfo.value.status_code == 400
    assert excinfo.value.squad_message == "bad request"