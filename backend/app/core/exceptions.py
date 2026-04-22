"""
Custom exceptions + FastAPI exception handlers
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


# ── Handlers ─────────────────────────────────────────────────────────────────

async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "details": exc.errors()},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


# ── Convenience shortcuts ─────────────────────────────────────────────────────

class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(404, f"{resource} not found")


class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(401, detail)


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(403, detail)


class ConflictError(AppException):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(409, detail)


class BadRequestError(AppException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(400, detail)
