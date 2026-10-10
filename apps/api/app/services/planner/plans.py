"""계획 초안 (REQ-07). 배치·판정은 엔진이 하고(AD-5), 여기서는 입력을 읽고 결과를 `plans`에 남긴다.

목록·수정(빼기·바꾸기)·확정은 #8에서 이 파일에 더한다.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.units import int_to_dow, ints_to_dows, min_to_hhmm
from app.models.catalog import Institution
from app.models.catalog import Program as ProgramRow
from app.models.family import Child
from app.models.planner import Plan as PlanRow
from app.schemas.planner import Plan, PlanItem
from app.services.planner import engine, inputs

DRAFT = "draft"


class PlanNotFound(Exception):
    """The plan does not exist or belongs to another parent's child."""


async def create_draft(db: AsyncSession, parent_id: str, child_id: str) -> Plan:
    """저장된 조건으로 주간 일정을 만든다. 해가 없으면 422 `no_feasible_plan`(AD-13)."""
    child = await inputs.owned_child(db, parent_id, child_id)
    cond = await inputs.conditions(db, child.id)
    school = await inputs.school(db, child)
    dismissal = await inputs.dismissal(db, child)
    ctx = engine.Context(
        grade=child.grade,
        school_location=inputs.location(school),
        dismissal=dismissal,
        existing=inputs.existing(child),
    )
    result = engine.generate(await inputs.programs(db, child.school_id, school), ctx, cond)
    if isinstance(result, engine.NoFeasiblePlan):
        raise AppError(422, "no_feasible_plan", {"relaxations": list(result.relaxations)})

    row = PlanRow(
        child_id=child.id,
        status=DRAFT,
        items=result.items(),
        school_snapshot={str(dow): minute for dow, minute in sorted(dismissal.items())},
        budget_cap=cond.budget_cap,
        monthly_total=result.monthly_total,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return await to_api(db, row, list(result.violations))


async def get(db: AsyncSession, parent_id: str, plan_id: str) -> Plan:
    row = await owned_plan(db, parent_id, plan_id)
    return await to_api(db, row, [])


async def owned_plan(db: AsyncSession, parent_id: str, plan_id: str) -> PlanRow:
    try:
        plan_uuid = uuid.UUID(plan_id)
    except ValueError:
        raise PlanNotFound from None
    row = await db.scalar(
        select(PlanRow)
        .join(Child, PlanRow.child_id == Child.id)
        .where(PlanRow.id == plan_uuid, Child.parent_id == uuid.UUID(parent_id))
    )
    if row is None:
        raise PlanNotFound
    return row


async def to_api(db: AsyncSession, row: PlanRow, violations: list[engine.Violation]) -> Plan:
    ids = [uuid.UUID(i["program_id"]) for i in row.items]
    found = await db.execute(
        select(ProgramRow.id, ProgramRow.type, Institution.name)
        .join(Institution, ProgramRow.institution_id == Institution.id)
        .where(ProgramRow.id.in_(ids))
    )
    names = {str(pid): (ptype, name) for pid, ptype, name in found.all()}
    items = []
    for i in row.items:
        ptype, name = names.get(i["program_id"], ("academy", ""))
        items.append(
            PlanItem(
                program_id=i["program_id"],
                institution_name=name,
                subject=i["subject"],
                type=ptype,
                days=ints_to_dows(i["days"]),
                start=min_to_hhmm(i["start_min"]),
                end=min_to_hhmm(i["end_min"]),
                monthly_tuition=i["monthly_tuition"] or 0,
                monthly_other=i["monthly_other"],
            )
        )
    return Plan(
        id=str(row.id),
        child_id=str(row.child_id),
        status=row.status,
        items=items,
        school={int_to_dow(int(d)): min_to_hhmm(m) for d, m in row.school_snapshot.items()},
        budget_cap=row.budget_cap,
        monthly_total=row.monthly_total,
        violations=[
            {"program_id": v.program_id, "kind": v.kind, "amount": v.amount} for v in violations
        ],
        created_at=row.created_at,
    )
