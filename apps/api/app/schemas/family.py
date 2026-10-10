"""family request and response models. No real name or contact fields (SEC-07)."""

from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.units import Hhmm
from app.core.vocab import Dow


class ExistingEvent(BaseModel):
    dow: Dow
    start: Hhmm
    end: Hhmm
    label: str = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def _order(self) -> Self:
        if self.end <= self.start:
            raise ValueError("end must be later than start")
        return self


class ChildIn(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown fields (e.g. real names) are rejected

    alias: str = Field(min_length=1, max_length=20)
    age: int = Field(ge=0, le=18)
    grade: int = Field(ge=1, le=9)
    school_id: str | None = None
    interests: list[str] = Field(default_factory=list)
    goal: str = Field(default="", max_length=200)
    existing_events: list[ExistingEvent] = Field(default_factory=list)
    manual_dismissal: dict[Dow, Hhmm] = Field(default_factory=dict)
    consent_checked: bool = False  # required when age < 14: 422 consent_required


class Child(ChildIn):
    model_config = ConfigDict(extra="ignore")

    id: str
