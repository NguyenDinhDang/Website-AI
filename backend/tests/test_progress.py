"""Tests for /api/v1/progress endpoints"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_get_progress(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/progress/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_documents"] == 0
    assert data["accuracy"] == 0.0


async def test_reset_progress(client: AsyncClient, auth_headers: dict):
    resp = await client.delete("/api/v1/progress/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total_quizzes"] == 0
