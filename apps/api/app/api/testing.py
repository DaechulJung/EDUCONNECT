"""Test routes (AD-11): registered only when ENABLE_TEST_ROUTES=1 (see app.main)."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import fake
from app.core import clock
from app.core.db import get_session
from app.core.errors import AppError
from app.schemas.testing import (
    ClockAdvance,
    ClockNow,
    LlmMode,
    LlmRequest,
    ResetRequest,
    ResetResult,
)
from app.seed import load

router = APIRouter(prefix="/test", tags=["testing"])


@router.post("/reset")
async def reset_seed(
    db: Annotated[AsyncSession, Depends(get_session)],
    body: Annotated[ResetRequest | None, Body()] = None,
) -> ResetResult:
    """Back to the seed: clears every table, loads the seed, resets the clock and the LLM double.

    `omit_timetable` leaves those (school key, grade) timetable rows out of the load.
    """
    omit = {(o.school, o.grade) for o in body.omit_timetable} if body else set()
    unknown = {school for school, _ in omit} - load.school_keys()
    if unknown:
        raise AppError(422, "unknown_school", {"schools": sorted(unknown)})
    await load.reset(db, omit_timetable=omit)
    clock.reset()
    fake.provider.reset()
    return ResetResult(reset=True)


@router.post("/clock")
async def advance_clock(body: ClockAdvance) -> ClockNow:
    return ClockNow(now=clock.advance(body.advance_minutes))


@router.post("/llm")
async def set_llm_mode(body: LlmMode) -> LlmMode:
    fake.provider.configure(body.task, body.mode, body.response)
    return body


@router.get("/llm/requests")
async def list_llm_requests() -> list[LlmRequest]:
    return [LlmRequest(**request) for request in fake.provider.requests]
