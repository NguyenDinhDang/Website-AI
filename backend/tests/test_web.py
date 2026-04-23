"""Tests for HTMX web routes."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_root_shows_auth_shell(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert 'id="page-shell"' in resp.text
    assert "Dang nhap" in resp.text


async def test_web_register_returns_workspace(client: AsyncClient):
    resp = await client.post("/web/auth/register", data={
        "email": "web@example.com",
        "username": "webuser",
        "password": "Password123",
        "full_name": "Web User",
    })
    assert resp.status_code == 200
    assert 'id="workspace-shell"' in resp.text
    assert client.cookies.get("access_token")


async def test_web_login_failure_renders_error(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@example.com",
        "username": "loginuser",
        "password": "Password123",
    })
    resp = await client.post("/web/auth/login", data={
        "email": "login@example.com",
        "password": "wrong-password",
    })
    assert resp.status_code == 200
    assert "Invalid email or password" in resp.text
