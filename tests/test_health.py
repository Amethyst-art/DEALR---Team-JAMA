"""Smoke test for the /health endpoint."""

from __future__ import annotations

import httpx
import pytest


async def test_health_returns_200(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
