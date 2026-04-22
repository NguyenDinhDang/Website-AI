"""Tests for /api/v1/auth endpoints"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "alice@example.com",
        "username": "alice",
        "password": "Secure1234",
        "full_name": "Alice"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert "id" in data


async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@example.com", "username": "dup1", "password": "Pass1234"}
    await client.post("/api/v1/auth/register", json=payload)
    payload["username"] = "dup2"
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "bob@example.com", "username": "bob", "password": "Pass5678"
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "bob@example.com", "password": "Pass5678"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert "refresh_token" in resp.json()


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "carol@example.com", "username": "carol", "password": "RealPass1"
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "carol@example.com", "password": "WrongPass"
    })
    assert resp.status_code == 401


async def test_me_authenticated(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403
