"""Squad API client with retry-aware error handling."""

from __future__ import annotations

import structlog
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import Settings
from app.squad.errors import (
    SquadError,
    SquadRequeryableError,
    SquadTransientError,
)


class SquadClient:
    """Client for Squad API calls using a shared httpx.AsyncClient."""

    def __init__(self, *, http_client: httpx.AsyncClient, settings: Settings) -> None:
        self._client = http_client
        self._base_url = settings.SQUAD_BASE_URL.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {settings.SQUAD_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        self._log = structlog.get_logger()

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        endpoint = path if path.startswith("/") else f"/{path}"
        url = f"{self._base_url}{endpoint}"
        self._log.info("squad.call.start", endpoint=endpoint, method=method)

        try:
            response = await self._send_request(method, url, json=json, params=params)
        except SquadError as exc:
            self._log.warning(
                "squad.call.error",
                endpoint=endpoint,
                status_code=getattr(exc, "status_code", None),
                squad_message=getattr(exc, "squad_message", None),
            )
            raise

        self._log.info(
            "squad.call.done",
            endpoint=endpoint,
            status_code=response.status_code,
            latency_ms=int(response.elapsed.total_seconds() * 1000),
        )

        return response.json()

    @retry(
        wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(
            (httpx.RequestError, SquadTransientError, SquadRequeryableError)
        ),
        reraise=True,
    )
    async def _send_request(
        self,
        method: str,
        url: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        try:
            response = await self._client.request(
                method,
                url,
                headers=self._headers,
                json=json,
                params=params,
                timeout=httpx.Timeout(15.0),
            )
        except httpx.RequestError as exc:
            self._log.warning("squad.call.request_error", url=url, error=str(exc))
            raise

        status_code = response.status_code
        if status_code == 424:
            raise SquadRequeryableError(
                "Squad request requires requery",
                squad_message=response.text,
            )
        if 500 <= status_code < 600:
            raise SquadTransientError(
                "Squad transient server error",
                squad_message=response.text,
            )
        if status_code >= 400:
            error = SquadError.from_status_code(
                status_code,
                "Squad returned an error response",
                squad_message=response.text,
            )
            if error is not None:
                raise error

        return response
