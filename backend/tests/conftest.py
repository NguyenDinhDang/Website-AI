"""
Shared pytest fixtures — in-memory SQLite async for fast unit tests.

Import order matters:
  1. Override DATABASE_URL in settings (before any engine is created)
  2. Inject test engine into session module
  3. THEN import app.main (which triggers all other imports)
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# ── Step 1: patch settings URL before anything touches the DB ─────────────────
from app.core.config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# ── Step 2: build test engine and inject into session module ──────────────────
import app.database.session as _session_mod

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine_test = create_async_engine(TEST_DB_URL, echo=False)
TestSessionFactory = async_sessionmaker(
    bind=engine_test, class_=AsyncSession, expire_on_commit=False
)

# Inject directly so _get_engine() / _get_session_factory() always return test objects
_session_mod._engine = engine_test
_session_mod._session_factory = TestSessionFactory

# ── Step 3: NOW safe to import the app ───────────────────────────────────────
from app.main import app
from app.database.session import Base, get_db


# ── Override FastAPI DB dependency ────────────────────────────────────────────
async def override_get_db():
    async with TestSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True, scope="function")
async def setup_db():
    """Create all tables before each test, drop after."""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    """Register + login, return Authorization headers."""
    await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "Password123",
        "full_name": "Test User",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Password123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
