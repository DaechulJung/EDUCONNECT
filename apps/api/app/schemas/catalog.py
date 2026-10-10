"""catalog request and response models (AD-6 API units: "HH:MM", "mon".."sun", won, grade)."""

from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.core.units import Hhmm
from app.core.vocab import AcademyProgramType, Dow, ProgramType

Grade = Field(ge=1, le=9)
# Trimmed before the length check, so whitespace-only text is a 422 and never reaches the row.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class _ProgramFields(BaseModel):
    subject: Name
    days: list[Dow] = Field(min_length=1)
    start: Hhmm
    end: Hhmm
    monthly_tuition: int | None = Field(ge=0, description="NULL = 미공개, 0 = 무료")
    monthly_other: int = Field(default=0, ge=0)
    instructor: Name
    grade_min: int = Grade
    grade_max: int = Grade
    capacity: int = Field(ge=1)
    enrolled: int = Field(ge=0)

    @model_validator(mode="after")
    def _ranges(self) -> Self:
        if self.end <= self.start:
            raise ValueError("end must be later than start")
        if self.grade_min > self.grade_max:
            raise ValueError("grade_min must not exceed grade_max")
        if self.enrolled > self.capacity:
            raise ValueError("enrolled must not exceed capacity")
        if len(set(self.days)) != len(self.days):
            raise ValueError("days must not repeat")
        return self


class ProgramIn(_ProgramFields):
    """Academy program. Location is required (REQ-02)."""

    type: AcademyProgramType
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Program(ProgramIn):
    id: str
    institution_id: str


class AfterSchoolIn(_ProgramFields):
    """School after-school program: type is after_school and the location is the school's."""


class AfterSchoolProgram(AfterSchoolIn):
    id: str
    institution_id: str
    type: ProgramType = "after_school"
    lat: float
    lng: float


class TimetableEntry(BaseModel):
    grade: int = Grade
    dow: Dow
    dismissal: Hhmm


class TimetableUpdate(BaseModel):
    """Upsert by (grade, dow); rows not listed stay as they are."""

    entries: list[TimetableEntry]


class SchoolTimetable(BaseModel):
    school_id: str
    entries: list[TimetableEntry]


class ImpactCount(BaseModel):
    program_id: str | None = None
    grade: int | None = None
    affected_plans: int


class OrgImpact(BaseModel):
    """Counts only: no child, parent or plan ids (AD-4, AC-09.7)."""

    affected_plans: int
    items: list[ImpactCount]


class School(BaseModel):
    """A school choice for the children form (#4): id and name only."""

    id: str
    name: str
