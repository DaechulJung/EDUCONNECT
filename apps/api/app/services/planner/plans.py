"""계획 초안·수정·확정·목록 (REQ-07·08). 배치·판정은 엔진이 하고(AD-5), 여기서는 입력을 읽고
결과를 `plans`에 남긴다. `plans`는 이 파일만 쓴다.

초안 수정(빼기·바꾸기)은 위반이 있어도 저장하고 200으로 위반을 돌려준다. 확정은 엔진 검증을
다시 실행해 위반이 0건일 때만 스냅숏(항목·하교 시각·예산 상한, AD-4)을 저장하고, 같은 자녀의
이전 확정 계획은 `superseded`로 바꾼다(AD-13: 실패는 409 `violations`).
"""

import uuid

from sqlalchemy import case, select, update
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
CONFIRMED = "confirmed"
SUPERSEDED = "superseded"
# 바꾸기 후보: 학년·공개 교습비·정원만 거르고 과목·유형·요일 조건은 보지 않는다.
ANY_CONDITION = engine.Conditions(
    subjects=(), budget_target=0, budget_cap=engine.UNLIMITED_BUDGET, days=engine.ALL_DAYS
)


class PlanNotFound(Exception):
    """The plan does not exist or belongs to another parent's child."""


async def create_draft(db: AsyncSession, parent_id: str, child_id: str) -> Plan:
    """저장된 조건으로 주간 일정을 만든다. 해가 없으면 422 `no_feasible_plan`(AD-13)."""
    child = await inputs.owned_child(db, parent_id, child_id)
    ctx, cond, catalog = await _inputs(db, child)
    result = engine.generate(catalog, ctx, cond)
    if isinstance(result, engine.NoFeasiblePlan):
        raise AppError(422, "no_feasible_plan", {"relaxations": list(result.relaxations)})

    row = PlanRow(child_id=child.id, status=DRAFT)
    _snapshot(row, result.programs, ctx, cond)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return await to_api(db, row, list(result.violations))


async def update_draft(
    db: AsyncSession, parent_id: str, plan_id: str, program_ids: list[str]
) -> Plan:
    """빼기·바꾸기: 초안이 가질 프로그램 ID 전체로 바꾸고 다시 검증한다. 위반이 있어도 저장한다."""
    row = await owned_plan(db, parent_id, plan_id)
    _require_draft(row)
    child = await db.get(Child, row.child_id)
    ctx, cond, catalog = await _inputs(db, child)
    chosen = _choose(catalog, ctx, program_ids)
    violations = engine.validate(chosen, ctx, cond.budget_cap)
    _snapshot(row, chosen, ctx, cond)
    await db.commit()
    await db.refresh(row)
    return await to_api(db, row, violations)


async def confirm(db: AsyncSession, parent_id: str, plan_id: str) -> Plan:
    """엔진 재검증 위반 0건일 때만 확정한다(AD-5). 같은 자녀의 이전 확정 계획은 superseded."""
    row = await owned_plan(db, parent_id, plan_id)
    # 같은 자녀의 확정이 겹치지 않게 자녀 행을 잠그고 계획 상태를 다시 읽는다.
    child = await db.scalar(select(Child).where(Child.id == row.child_id).with_for_update())
    await db.refresh(row)
    _require_draft(row)
    ctx, cond, catalog = await _inputs(db, child)
    chosen = _choose(catalog, ctx, [i["program_id"] for i in row.items])
    violations = engine.validate(chosen, ctx, cond.budget_cap)
    if violations:
        await db.rollback()
        raise AppError(409, "violations", {"violations": _violations(violations)})

    await db.execute(
        update(PlanRow)
        .where(PlanRow.child_id == row.child_id, PlanRow.status == CONFIRMED)
        .values(status=SUPERSEDED)
    )
    _snapshot(row, chosen, ctx, cond)
    row.status = CONFIRMED
    await db.commit()
    await db.refresh(row)
    return await to_api(db, row, [])


async def list_plans(db: AsyncSession, parent_id: str, child_id: str | None) -> list[Plan]:
    """자기 자녀의 확정 계획과 초안. 확정 먼저, 그다음 최근 생성 순. superseded는 뺀다."""
    query = (
        select(PlanRow)
        .join(Child, PlanRow.child_id == Child.id)
        .where(Child.parent_id == uuid.UUID(parent_id), PlanRow.status.in_((DRAFT, CONFIRMED)))
    )
    if child_id is not None:
        child = await inputs.owned_child(db, parent_id, child_id)
        query = query.where(PlanRow.child_id == child.id)
    query = query.order_by(
        case((PlanRow.status == CONFIRMED, 0), else_=1), PlanRow.created_at.desc(), PlanRow.id
    )
    rows = list(await db.scalars(query))
    cache: dict[uuid.UUID, tuple] = {}
    return [await to_api(db, r, await _current_violations(db, r, cache)) for r in rows]


async def get(db: AsyncSession, parent_id: str, plan_id: str) -> Plan:
    row = await owned_plan(db, parent_id, plan_id)
    return await to_api(db, row, await _current_violations(db, row, {}))


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
        violations=_violations(violations),
        created_at=row.created_at,
    )


async def _inputs(
    db: AsyncSession, child: Child
) -> tuple[engine.Context, engine.Conditions, list[engine.Program]]:
    """엔진 입력: 자녀의 하교 시각·기존 일정, 저장된 조건, 현재 프로그램 목록."""
    school = await inputs.school(db, child)
    ctx = engine.Context(
        grade=child.grade,
        school_location=inputs.location(school),
        dismissal=await inputs.dismissal(db, child),
        existing=inputs.existing(child),
    )
    cond = await inputs.conditions(db, child.id)
    return ctx, cond, await inputs.programs(db, child.school_id, school)


def _require_draft(row: PlanRow) -> None:
    if row.status != DRAFT:
        raise AppError(409, "plan_not_draft")


def _choose(
    catalog: list[engine.Program], ctx: engine.Context, program_ids: list[str]
) -> tuple[engine.Program, ...]:
    """요청 순서대로 프로그램을 고른다. 없거나(삭제·남의 학교 방과후) 고를 수 없으면 422."""
    if not program_ids:
        raise AppError(422, "empty_plan")
    if len(set(program_ids)) != len(program_ids):
        raise AppError(422, "duplicate_program")
    open_ = {p.id: p for p in engine.eligible(catalog, ctx, ANY_CONDITION)}
    missing = [pid for pid in program_ids if pid not in open_]
    if missing:
        raise AppError(422, "unknown_program", {"program_ids": missing})
    return tuple(open_[pid] for pid in program_ids)


def _snapshot(
    row: PlanRow,
    programs: tuple[engine.Program, ...],
    ctx: engine.Context,
    cond: engine.Conditions,
) -> None:
    """AD-4 스냅숏: 항목(AD-16), 요일별 하교 시각, 예산 상한, 월 학원비."""
    row.items = [p.item() for p in programs]
    row.school_snapshot = {str(dow): minute for dow, minute in sorted(ctx.dismissal.items())}
    row.budget_cap = cond.budget_cap
    row.monthly_total = engine.monthly_total(programs)


async def _current_violations(
    db: AsyncSession, row: PlanRow, cache: dict[uuid.UUID, tuple]
) -> list[engine.Violation]:
    """초안이면 확정 때와 같은 검증을 지금 데이터로 돌린다(화면의 확정 버튼 상태). 그 외는 빈 목록."""
    if row.status != DRAFT:
        return []
    if row.child_id not in cache:
        cache[row.child_id] = await _inputs(db, await db.get(Child, row.child_id))
    ctx, cond, catalog = cache[row.child_id]
    by_id = {p.id: p for p in catalog}
    programs = [by_id[i["program_id"]] for i in row.items if i["program_id"] in by_id]
    return engine.validate(programs, ctx, cond.budget_cap)


def _violations(violations: list[engine.Violation]) -> list[dict]:
    return [{"program_id": v.program_id, "kind": v.kind, "amount": v.amount} for v in violations]
