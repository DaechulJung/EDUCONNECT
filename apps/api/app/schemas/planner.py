"""planner request and response models: recommendations, plans, impact and adjustment."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.core.units import Hhmm
from app.core.vocab import Dow, ImpactReason, PlanStatus, ProgramType, ViolationKind


class RecommendationRequest(BaseModel):
    child_id: str


class Recommendation(BaseModel):
    program_id: str
    institution_name: str
    subject: str
    type: ProgramType
    days: list[Dow]
    start: Hhmm
    end: Hhmm
    monthly_tuition: int
    monthly_other: int
    travel_km: float  # approximate (AD-7)
    travel_min: int
    reason: str
    reason_source: Literal["llm", "template"]


class RecommendationList(BaseModel):
    child_id: str
    items: list[Recommendation]


class PlanItem(BaseModel):
    program_id: str
    institution_name: str
    subject: str
    type: ProgramType
    days: list[Dow]
    start: Hhmm
    end: Hhmm
    monthly_tuition: int
    monthly_other: int


class Violation(BaseModel):
    program_id: str | None
    kind: ViolationKind
    amount: int | None = None  # over_budget: won over the cap


class ImpactReasonItem(BaseModel):
    kind: ImpactReason
    program_id: str | None = None
    amount: int | None = None


class PlanImpact(BaseModel):
    affected: bool  # any of time_overlap, travel_short, over_budget
    reasons: list[ImpactReasonItem]


class Plan(BaseModel):
    id: str
    child_id: str
    status: PlanStatus
    items: list[PlanItem]
    school: dict[Dow, Hhmm]  # dismissal time per weekday used for this plan
    budget_cap: int
    monthly_total: int
    violations: list[Violation]
    impact: PlanImpact | None = None  # confirmed plans only
    created_at: datetime


class PlanDraftRequest(BaseModel):
    child_id: str


class PlanUpdate(BaseModel):
    """Remove or swap programs: the full list of program ids the draft should keep."""

    program_ids: list[str]


class Adjustment(BaseModel):
    plan_id: str
    reasons: list[ImpactReasonItem]
    proposal: list[PlanItem]
    monthly_total: int
    violations: list[Violation]  # always empty for a proposal
