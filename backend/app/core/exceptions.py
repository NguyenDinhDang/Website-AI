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
        content={"detail": exc.detail},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_errors = exc.errors()
    first_error_msg = raw_errors[0].get("msg", "Validation error") if raw_errors else "Validation error"

    serializable_errors = []
    for error_item in raw_errors:
        sanitized_item = {key: value for key, value in error_item.items() if key != "ctx"}
        if "ctx" in error_item:
            sanitized_item["ctx"] = {
                ctx_key: str(ctx_value)
                for ctx_key, ctx_value in error_item["ctx"].items()
            }
        serializable_errors.append(sanitized_item)

    return JSONResponse(
        status_code=422,
        content={"detail": first_error_msg, "errors": serializable_errors},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
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
