"""Value lists in one place (AD-15). Codes are stored and sent; labels are what screens show."""

from typing import Literal

ProgramType = Literal["academy", "arts", "other", "after_school"]
AcademyProgramType = Literal["academy", "arts", "other"]  # after_school comes from schools only

PROGRAM_TYPE_LABELS: dict[str, str] = {
    "academy": "교과 학원",
    "arts": "예체능 학원",
    "other": "기타",
    "after_school": "방과후",
}

Dow = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DOW_CODES: tuple[str, ...] = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
DOW_LABELS: dict[str, str] = dict(zip(DOW_CODES, "월화수목금토일", strict=True))

Role = Literal["parent", "academy", "school"]
ROLE_LABELS: dict[str, str] = {
    "parent": "보호자",
    "academy": "학원 담당자",
    "school": "학교 담당자",
}

Density = Literal["tight", "normal"]
DENSITY_LABELS: dict[str, str] = {"tight": "촘촘하게", "normal": "보통"}

InstitutionKind = Literal["academy", "school"]
PlanStatus = Literal["draft", "confirmed", "superseded"]
ViolationKind = Literal["time_overlap", "travel_short", "over_budget"]
ImpactReason = Literal["time_overlap", "travel_short", "over_budget", "content_changed"]


def normalize_subject(subject: str) -> str:
    """Subjects are Korean strings matched exactly after trimming (AD-15)."""
    return subject.strip()
