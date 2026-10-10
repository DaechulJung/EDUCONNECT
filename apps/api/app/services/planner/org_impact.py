"""기관 화면의 영향받는 계획 수 (AD-4, AC-09.1·09.7). 개수만 돌려준다.

자녀·보호자·계획 ID는 넣지 않는다. 학원 담당자는 자기 기관 프로그램(삭제 포함)을 쓰는 확정
계획을, 학교 담당자는 자기 학교 자녀의 확정 계획을 학년별로 센다. '영향받는'은 영향 판정에 위반
사유가 하나라도 있는 계획이다. 다른 기관의 `program_id`는 자기 기관 대상에 없으므로 0건이다.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Program as ProgramRow
from app.models.family import Child
from app.models.planner import Plan as PlanRow
from app.schemas.catalog import ImpactCount, OrgImpact
from app.services.planner import plans


async def counts(
    db: AsyncSession,
    role: str,
    institution_id: str | None,
    program_id: str | None,
    grade: int | None,
) -> OrgImpact:
    if institution_id is None:
        return OrgImpact(affected_plans=0, items=[])
    inst = uuid.UUID(institution_id)
    if role == "school":
        return await _school(db, inst, grade)
    return await _academy(db, inst, program_id)


async def _affected(db: AsyncSession, rows: list[PlanRow]) -> list[PlanRow]:
    cache: dict[uuid.UUID, tuple] = {}
    return [r for r in rows if (await plans.assess(db, r, cache)).affected]


async def _academy(db: AsyncSession, inst: uuid.UUID, program_id: str | None) -> OrgImpact:
    own = {
        str(i)
        for i in await db.scalars(select(ProgramRow.id).where(ProgramRow.institution_id == inst))
    }
    targets = sorted(own if program_id is None else own & {program_id})
    confirmed = list(await db.scalars(select(PlanRow).where(PlanRow.status == plans.CONFIRMED)))
    using = [r for r in confirmed if {i["program_id"] for i in r.items} & set(targets)]
    affected = await _affected(db, using)
    per = {t: sum(1 for r in affected if t in {i["program_id"] for i in r.items}) for t in targets}
    items = [
        ImpactCount(program_id=t, affected_plans=n) for t, n in per.items() if n or t == program_id
    ]
    return OrgImpact(affected_plans=len(affected), items=items)


async def _school(db: AsyncSession, inst: uuid.UUID, grade: int | None) -> OrgImpact:
    query = (
        select(PlanRow, Child.grade)
        .join(Child, PlanRow.child_id == Child.id)
        .where(Child.school_id == inst, PlanRow.status == plans.CONFIRMED)
    )
    if grade is not None:
        query = query.where(Child.grade == grade)
    found = (await db.execute(query)).all()
    affected = {r.id for r in await _affected(db, [r for r, _ in found])}
    per: dict[int, int] = {} if grade is None else {grade: 0}
    for r, g in found:
        if r.id in affected:
            per[g] = per.get(g, 0) + 1
    items = [ImpactCount(grade=g, affected_plans=n) for g, n in sorted(per.items())]
    return OrgImpact(affected_plans=len(affected), items=items)
