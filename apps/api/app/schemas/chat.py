"""chat request and response models: one chat turn and the per-child conditions."""

from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.core.vocab import Density, Dow, ProgramType

WON_MAX = 2_147_483_647  # budgets are PostgreSQL integer columns (AD-6)


class ChatMessageIn(BaseModel):
    child_id: str
    text: str = Field(min_length=1, max_length=500)


class ConditionsIn(BaseModel):
    subjects: list[str] = Field(default_factory=list)
    budget_target: int = Field(ge=0, le=WON_MAX)
    budget_cap: int = Field(ge=0, le=WON_MAX)
    types: list[ProgramType] = Field(default_factory=list, description="비어 있으면 모든 유형")
    days: list[Dow] = Field(default_factory=list, description="비어 있으면 월~금(기본값)")
    density: Density = "normal"

    @model_validator(mode="after")
    def _budget(self) -> Self:
        if self.budget_cap < self.budget_target:
            raise ValueError("budget_cap must be at least budget_target")
        return self


class Conditions(ConditionsIn):
    child_id: str


class ChatReply(BaseModel):
    reply: str
    conditions: Conditions  # a draft for the condition card; saved only by PUT
    source: Literal["llm", "fallback"]
