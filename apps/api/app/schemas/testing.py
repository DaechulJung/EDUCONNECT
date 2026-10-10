"""Test route models (AD-11)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ClockAdvance(BaseModel):
    advance_minutes: int = Field(ge=0, le=60 * 24 * 30)


class ClockNow(BaseModel):
    now: datetime


class LlmMode(BaseModel):
    task: str
    mode: Literal["fixed", "bad_json", "error"]
    response: Any = None


class LlmRequest(BaseModel):
    task: str
    messages: list[dict[str, str]]


class TimetableOmit(BaseModel):
    school: str = Field(min_length=1)  # seed school key, e.g. "school-elem"
    grade: int = Field(ge=1, le=9)


class ResetRequest(BaseModel):
    """Optional reset body: seed rows to leave out (TC-27 needs a grade with no timetable)."""

    omit_timetable: list[TimetableOmit] = []


class ResetResult(BaseModel):
    reset: bool
