"""Error bodies (AD-13): 4xx business errors are {"detail": code, "data": {...}}.

5xx is {"detail": "server_error"} only.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger("app.errors")


class ErrorBody(BaseModel):
    detail: str
    data: dict[str, Any] | None = None


class AppError(Exception):
    """Raise from services with an error code from experience (`time_overlap`, `violations`...)."""

    def __init__(self, status_code: int, code: str, data: dict[str, Any] | None = None):
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.data = data


def not_implemented() -> AppError:
    """Route bodies the foundation registers before the owning Issue implements them (AD-3)."""
    return AppError(501, "not_implemented")


class FieldError(BaseModel):
    loc: list[str | int]
    msg: str
    type: str


class FieldErrors(BaseModel):
    """FastAPI's default input-validation 422 (`detail` is a list)."""

    detail: list[FieldError]


def error_responses(*codes: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI `responses=` entry so generated clients know the error body.

    422 is either a field-validation list or a business code (AD-13), so it carries both.
    """
    return {
        code: {"model": ErrorBody | FieldErrors if code == 422 else ErrorBody} for code in codes
    }


def install(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        body: dict[str, Any] = {"detail": exc.code}
        if exc.data is not None:
            body["data"] = exc.data
        return JSONResponse(body, status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _server_error(_: Request, exc: Exception) -> JSONResponse:
        # The masking filter (core/logging.py) hides configured secrets in this record.
        logger.error("unhandled error", exc_info=exc)
        return JSONResponse({"detail": "server_error"}, status_code=500)
