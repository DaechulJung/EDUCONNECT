"""기관 화면의 영향받는 계획 수 (AD-4, AC-09.1·09.7). 개수만 돌려준다.

자녀·보호자·계획 ID는 넣지 않는다. 세는 것은 "이 기관 변경으로 영향받는 계획"이다
(experience 37·90행).
- 학원: 확정 뒤 바뀌거나 삭제된 자기 프로그램을 쓰고, 영향(위반·내용 변경)이 있는 확정 계획.
  다른 학원의 변경으로 생긴 위반은 세지 않는다. 예산 초과는 사유에 `program_id`가 없으므로 바뀐
  프로그램으로 원인을 정한다.
- 학교: 자기 학교 자녀의 확정 계획 중 하교 시각이 확정 스냅숏과 달라졌고 위반이 있는 계획(학년별).
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


async def _academy(db: AsyncSession, inst: uuid.UUID, program_id: str | None) -> OrgImpact:
    own = {
        str(i)
        for i in await db.scalars(select(ProgramRow.id).where(ProgramRow.institution_id == inst))
    }
    targets = sorted(own if program_id is None else own & {program_id})
    confirmed = list(await db.scalars(select(PlanRow).where(PlanRow.status == plans.CONFIRMED)))
    using = [r for r in confirmed if {i["program_id"] for i in r.items} & set(targets)]
    cache: dict[uuid.UUID, tuple] = {}
    caused: list[frozenset[str]] = []  # per affected plan: the own programs whose change it follows
    for r in using:
        found = await plans.cause(db, r, cache)
        mine = found.changed_programs & set(targets)
        if found.found.affected and mine:
            caused.append(mine)
    per = {t: sum(1 for mine in caused if t in mine) for t in targets}
    items = [
        ImpactCount(program_id=t, affected_plans=n) for t, n in per.items() if n or t == program_id
    ]
    return OrgImpact(affected_plans=len(caused), items=items)


async def _school(db: AsyncSession, inst: uuid.UUID, grade: int | None) -> OrgImpact:
    query = (
        select(PlanRow, Child.grade)
        .join(Child, PlanRow.child_id == Child.id)
        .where(Child.school_id == inst, PlanRow.status == plans.CONFIRMED)
    )
    if grade is not None:
        query = query.where(Child.grade == grade)
    found = (await db.execute(query)).all()
    cache: dict[uuid.UUID, tuple] = {}
    affected: set[uuid.UUID] = set()
    for r, _ in found:
        c = await plans.cause(db, r, cache)
        if c.dismissal_changed and c.found.violations:
            affected.add(r.id)
    per: dict[int, int] = {} if grade is None else {grade: 0}
    for r, g in found:
        if r.id in affected:
            per[g] = per.get(g, 0) + 1
    items = [ImpactCount(grade=g, affected_plans=n) for g, n in sorted(per.items())]
    return OrgImpact(affected_plans=len(affected), items=items)
