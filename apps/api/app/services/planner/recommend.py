"""추천 비교표 (REQ-06). DB에서 엔진 입력을 읽고(AD-2 SELECT만), 필터·점수·정렬은 엔진이,
추천 이유 문장은 LLM이 만든다(AD-5). LLM이 실패하면 템플릿 설명으로 같은 표를 돌려준다."""

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.port import LlmUnavailable, Message, Provider, complete_json
from app.core.units import grade_label, ints_to_dows, min_to_hhmm
from app.models.catalog import Institution, Program
from app.models.chat import ChildCondition
from app.models.family import Child
from app.schemas.planner import Recommendation, RecommendationList
from app.services.planner import engine
from app.services.planner.travel import ROUTE_FACTOR, Point, haversine_km

TASK = "recommend_reasons"
ReasonSource = Literal["llm", "template"]


class NotOwned(Exception):
    """The child does not exist or belongs to another parent."""


SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["reasons"],
    "properties": {
        "reasons": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["program_id", "reason"],
                "properties": {"program_id": {"type": "string"}, "reason": {"type": "string"}},
            },
        }
    },
}

SYSTEM_PROMPT = """너는 보호자에게 학원 후보를 추천하는 이유를 한 문장(60자 이내)씩 쓴다.
JSON만 답한다. 후보마다 program_id와 reason을 준다. 순서·후보를 바꾸거나 빼지 않는다.
자녀의 관심사와 조건(과목·예산·요일·밀도), 후보의 과목·요일·이동 근사를 근거로 쓴다.
자녀: {child}
조건: {conditions}"""


class _Reasons(BaseModel):
    reasons: list[dict[str, str]]


async def recommend(
    db: AsyncSession, parent_id: str, child_id: str, *, provider: Provider | None = None
) -> RecommendationList:
    child = await _owned_child(db, parent_id, child_id)
    cond = await _conditions(db, child.id)
    school = await db.get(Institution, child.school_id) if child.school_id else None
    school_at: Point | None = (school.lat, school.lng) if school else None
    programs = await _programs(db, child.school_id, school)
    ctx = engine.Context(grade=child.grade, school_location=school_at)
    rows = engine.recommend(programs, ctx, cond)

    reasons, source = await _reasons(child, cond, rows, provider)
    return RecommendationList(
        child_id=str(child.id),
        items=[_to_api(r, school_at, reasons[r.program.id], source) for r in rows],
    )


async def _owned_child(db: AsyncSession, parent_id: str, child_id: str) -> Child:
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


async def _conditions(db: AsyncSession, child_id: uuid.UUID) -> engine.Conditions:
    row = await db.get(ChildCondition, child_id)
    if row is None:  # nothing saved yet: every program the child can take
        return engine.Conditions(subjects=(), budget_target=0, budget_cap=engine.UNLIMITED_BUDGET)
    return engine.Conditions(
        subjects=tuple(row.subjects),
        budget_target=row.budget_target,
        budget_cap=row.budget_cap,
        types=tuple(row.types),
        days=tuple(row.days) if row.days else engine.ALL_DAYS,
        density=row.density,
    )


async def _programs(
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


def template_reason(row: engine.Recommendation) -> str:
    """대체 경로 설명: 과목·주 횟수·이동 근사 시간(분)을 꼭 넣는다(AC-06.5)."""
    p = row.program
    return f"{p.subject} 주 {len(p.days)}회, 학교에서 이동 약 {row.travel_min}분(근사)"


def conditions_text(cond: engine.Conditions) -> str:
    subjects = "·".join(cond.subjects) or "정하지 않음"
    cap = "없음" if cond.budget_cap >= engine.UNLIMITED_BUDGET else f"{cond.budget_cap}원"
    days = "·".join(ints_to_dows(list(cond.days)))
    return (
        f"과목 {subjects}, 목표 월 예산 {cond.budget_target}원, 상한 {cap}, "
        f"요일 {days}, 밀도 {cond.density}"
    )


def build_messages(
    child: Child, cond: engine.Conditions, rows: list[engine.Recommendation]
) -> list[Message]:
    """보내는 자녀 정보는 별칭·학년·관심사뿐이다(AD-10, AC-10.4)."""
    hobbies = ", ".join(child.interests or []) or "없음"
    who = f"별칭 {child.alias}, 학년 {grade_label(child.grade)}, 관심사 {hobbies}"
    system = SYSTEM_PROMPT.format(child=who, conditions=conditions_text(cond))
    lines = [
        f"{r.program.id} | {r.program.institution_name} | {r.program.subject} | "
        f"{'·'.join(ints_to_dows(list(r.program.days)))} "
        f"{min_to_hhmm(r.program.start_min)}-{min_to_hhmm(r.program.end_min)} | "
        f"월 {r.program.monthly_cost}원 | 이동 약 {r.travel_min}분"
        for r in rows
    ]
    return [{"role": "system", "content": system}, {"role": "user", "content": "\n".join(lines)}]


async def _reasons(
    child: Child,
    cond: engine.Conditions,
    rows: list[engine.Recommendation],
    provider: Provider | None,
) -> tuple[dict[str, str], ReasonSource]:
    template = {r.program.id: template_reason(r) for r in rows}
    if not rows:
        return template, "template"
    try:
        value = await complete_json(
            TASK, SCHEMA, build_messages(child, cond, rows), provider=provider
        )
        found = {
            item["program_id"]: item["reason"].strip()
            for item in _Reasons.model_validate(value).reasons
            if item.get("reason", "").strip()
        }
    except LlmUnavailable, ValidationError, KeyError:
        return template, "template"
    if set(template) - set(found):  # a row without a reason: the whole table uses templates
        return template, "template"
    return {pid: found[pid] for pid in template}, "llm"


def _to_api(
    row: engine.Recommendation, school_at: Point | None, reason: str, source: ReasonSource
) -> Recommendation:
    p = row.program
    km = haversine_km(school_at, p.location) * ROUTE_FACTOR if school_at and p.location else 0.0
    return Recommendation(
        program_id=p.id,
        institution_name=p.institution_name,
        subject=p.subject,
        type=p.type,
        days=ints_to_dows(list(p.days)),
        start=min_to_hhmm(p.start_min),
        end=min_to_hhmm(p.end_min),
        monthly_tuition=p.monthly_tuition or 0,
        monthly_other=p.monthly_other,
        travel_km=round(km, 1),
        travel_min=row.travel_min,
        reason=reason,
        reason_source=source,
    )
