"""Alembic environment - supports SQLite and PostgreSQL"""

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

from app.core.config import settings
from app.database.session import Base
from app.models import user, document, chat, quiz, progress  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=IS_SQLITE,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=IS_SQLITE,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    extra = {"connect_args": {"check_same_thread": False}} if IS_SQLITE else {}
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        **extra,
    )
    async with engine.connect() as conn:
        if IS_SQLITE:
            await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())