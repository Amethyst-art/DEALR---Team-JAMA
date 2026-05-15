from __future__ import annotations

import datetime

import httpx
import pytest

from app.core.config import Settings
from app.squad.client import SquadClient
from app.squad.errors import SquadBadRequestError, SquadRequeryableError, SquadTransientError


class DummyResponse:
    def __init__(self, status_code: int, json_data: dict[str, object], text: str = "") -> None:
        self.status_code = status_code
        self._json_data = json_data
        self.text = text
        self.elapsed = datetime.timedelta(milliseconds=10)

    def json(self) -> dict[str, object]:
        return self._json_data


class DummyClient:
    def __init__(self, response: DummyResponse) -> None:
        self.response = response
        self.called = False

    async def request(self, *args: object, **kwargs: object) -> DummyResponse:
        self.called = True
        return self.response


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


@pytest.mark.asyncio
async def test_request_success_returns_json(settings: Settings) -> None:
    response = DummyResponse(200, {"ok": True})
    client = SquadClient(http_client=DummyClient(response), settings=settings)

    result = await client._request("GET", "/test")

    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_send_request_raises_requeryable_for_424(settings: Settings) -> None:
    response = DummyResponse(424, {}, text="needs requery")
    client = SquadClient(http_client=DummyClient(response), settings=settings)

    with pytest.raises(SquadRequeryableError):
        await client._request("POST", "/test")


@pytest.mark.asyncio
async def test_send_request_raises_transient_for_500(settings: Settings) -> None:
    response = DummyResponse(500, {}, text="server error")
    client = SquadClient(http_client=DummyClient(response), settings=settings)

    with pytest.raises(SquadTransientError):
        await client._request("POST", "/test")


@pytest.mark.asyncio
async def test_send_request_maps_400_to_bad_request(settings: Settings) -> None:
    response = DummyResponse(400, {}, text="bad request")
    client = SquadClient(http_client=DummyClient(response), settings=settings)

    with pytest.raises(SquadBadRequestError) as excinfo:
        await client._request("POST", "/test")

    assert excinfo.value.status_code == 400
    assert excinfo.value.squad_message == "bad request"
