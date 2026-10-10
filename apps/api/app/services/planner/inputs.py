"""엔진 입력 읽기 (AD-2: 다른 모듈 테이블은 SELECT만). 추천(#6)과 일정(#7)이 함께 쓴다."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Institution, Program, SchoolTimetable
from app.models.chat import ChildCondition
from app.models.family import Child
from app.services.planner import engine
from app.services.planner.travel import Point


class NotOwned(Exception):
    """The child does not exist or belongs to another parent."""


async def owned_child(db: AsyncSession, parent_id: str, child_id: str) -> Child:
    try:
        child_uuid = uuid.UUID(child_id)
    except ValueError:
        raise NotOwned from None
    child = await db.scalar(
        select(Child).where(Child.id == child_uuid, Child.parent_id == uuid.UUID(parent_id))
    )
    if child is None:
        raise NotOwned
    return child


async def conditions(db: AsyncSession, child_id: uuid.UUID) -> engine.Conditions:
    row = await db.get(ChildCondition, child_id)
    if row is None:  # nothing saved yet: every program the child can take
        return engine.Conditions(subjects=(), budget_target=0, budget_cap=engine.UNLIMITED_BUDGET)
    return engine.Conditions(
        subjects=tuple(row.subjects),
        budget_target=row.budget_target,
        budget_cap=row.budget_cap,
        types=tuple(row.types),
        days=tuple(row.days) if row.days else engine.WEEKDAYS,
        density=row.density,
    )


async def school(db: AsyncSession, child: Child) -> Institution | None:
    return await db.get(Institution, child.school_id) if child.school_id else None


def location(inst: Institution | None) -> Point | None:
    return (inst.lat, inst.lng) if inst else None


async def dismissal(db: AsyncSession, child: Child) -> dict[int, int]:
    """요일별 하교 시각: 학교 시간표(학년)가 있으면 그것, 없으면 자녀의 직접 입력."""
    if child.school_id:
        rows = await db.scalars(
            select(SchoolTimetable).where(
                SchoolTimetable.school_id == child.school_id, SchoolTimetable.grade == child.grade
            )
        )
        found = {r.dow: r.dismissal_min for r in rows}
        if found:
            return found
    return {int(dow): minute for dow, minute in (child.manual_dismissal or {}).items()}


def existing(child: Child) -> tuple[engine.Event, ...]:
    """기존 일정은 장소가 없어 시간 중복만 본다(AD-7)."""
    return tuple(
        engine.Event(e["dow"], e["start_min"], e["end_min"], e.get("label", ""))
        for e in child.existing_events or []
    )


async def programs(
    db: AsyncSession, school_id: uuid.UUID | None, school: Institution | None
) -> list[engine.Program]:
    """학원 프로그램 전부와 자녀 학교의 방과후만. 방과후는 학교 좌표를 쓴다(AD-7)."""
    rows = await db.execute(
        select(Program, Institution)
        .join(Institution, Program.institution_id == Institution.id)
        .where(Program.deleted_at.is_(None))
    )
    out = []
    for program, inst in rows.all():
        if program.type == "after_school" and program.institution_id != school_id:
            continue
        if program.lat is not None and program.lng is not None:
            at: Point | None = (program.lat, program.lng)
        else:
            at = (inst.lat, inst.lng)
        out.append(
            engine.Program(
                id=str(program.id),
                institution_name=inst.name,
                type=program.type,
                subject=program.subject,
                days=tuple(sorted(program.days)),
                start_min=program.start_min,
                end_min=program.end_min,
                monthly_tuition=program.monthly_tuition,
                monthly_other=program.monthly_other,
                grade_min=program.grade_min,
                grade_max=program.grade_max,
                capacity=program.capacity,
                enrolled=program.enrolled,
                location=at,
            )
        )
    return out
