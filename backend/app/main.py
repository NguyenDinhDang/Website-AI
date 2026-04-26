"""
AI Learning Assistant API entry point.
Registers routers, middleware, static assets, and exception handlers.
"""

from contextlib import asynccontextmanager
from pathlib import Path
import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.core.logging import setup_logging
from app.database.session import init_db
from app.routers import ai, auth, documents, progress

setup_logging()
logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parents[2]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.ENV)
    # Ensure upload directory exists before accepting requests
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    logger.info("Upload directory ready: %s", Path(settings.UPLOAD_DIR).resolve())
    await init_db()
    yield
    logger.info("Shutdown complete.")


app = FastAPI(
    title="AI Learning Assistant API",
    description="Backend for smart learning platform powered by generative AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(ai.router,        prefix="/api/v1/ai",        tags=["AI"])
app.include_router(progress.router,  prefix="/api/v1/progress",  tags=["Progress"])

app.mount("/assets", StaticFiles(directory=BASE_DIR / "public"), name="assets")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0.0", "env": settings.ENV}
