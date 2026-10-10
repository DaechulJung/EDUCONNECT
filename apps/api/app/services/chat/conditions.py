"""Per-child conditions and one chat turn (REQ-05). Writes `child_conditions` only (AD-2).

Every function takes the parent's account id and raises `NotOwned` when the child is not theirs
(or does not exist); the router turns it into an audited 404 (AD-8).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.port import Provider
from app.core import clock
from app.core.errors import AppError
from app.core.units import dows_to_ints, grade_label, ints_to_dows
from app.core.vocab import DENSITY_LABELS, PROGRAM_TYPE_LABELS, normalize_subject
from app.models.catalog import Program
from app.models.chat import ChildCondition
from app.models.family import Child
from app.schemas.chat import ChatReply, Conditions, ConditionsIn
from app.services.chat import extract as extraction

MAX_SUBJECT_LENGTH = 50


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


async def get(db: AsyncSession, parent_id: str, child_id: str) -> Conditions | None:
    """Saved conditions, or None when nothing is saved yet."""
    child = await owned_child(db, parent_id, child_id)
    row = await db.get(ChildCondition, child.id)
    return _to_api(row) if row else None


async def save(db: AsyncSession, parent_id: str, child_id: str, body: ConditionsIn) -> Conditions:
    child = await owned_child(db, parent_id, child_id)
    subjects = list(dict.fromkeys(normalize_subject(s) for s in body.subjects))
    if any(not s or len(s) > MAX_SUBJECT_LENGTH for s in subjects):
        raise AppError(422, "invalid_subject")
    values = {
        "subjects": subjects,
        "budget_target": body.budget_target,
        "budget_cap": body.budget_cap,
        "types": list(dict.fromkeys(body.types)),
        "days": dows_to_ints(body.days),
        "density": body.density,
        "updated_at": clock.now(),
    }
    statement = insert(ChildCondition).values(child_id=child.id, **values)
    await db.execute(
        statement.on_conflict_do_update(index_elements=[ChildCondition.child_id], set_=values)
    )
    await db.commit()
    row = await db.get(ChildCondition, child.id, populate_existing=True)
    return _to_api(row)


async def chat_turn(
    db: AsyncSession,
    parent_id: str,
    child_id: str,
    text: str,
    *,
    provider: Provider | None = None,
) -> ChatReply:
    """Extract a draft for the condition card. Nothing is saved (experience: 사람이 저장)."""
    child = await owned_child(db, parent_id, child_id)
    known = await known_subjects(db)
    context = extraction.child_context(child.alias, grade_label(child.grade), child.interests)
    found, source = await extraction.extract(
        text, child=context, known_subjects=known, provider=provider
    )
    saved = await db.get(ChildCondition, child.id)
    draft = merge(str(child.id), _to_api(saved) if saved else None, found)
    return ChatReply(reply=reply_text(draft, found), conditions=draft, source=source)


async def known_subjects(db: AsyncSession) -> list[str]:
    rows = await db.scalars(select(Program.subject).where(Program.deleted_at.is_(None)).distinct())
    catalog = sorted({normalize_subject(s) for s in rows if s.strip()})
    return list(dict.fromkeys([*extraction.BASE_SUBJECTS, *catalog]))


def merge(child_id: str, saved: Conditions | None, found: extraction.Extracted) -> Conditions:
    """What the sentence said wins; anything it did not mention keeps the saved value."""
    base = saved or Conditions(child_id=child_id, budget_target=0, budget_cap=0)
    budget = extraction.budget_range(found) or (base.budget_target, base.budget_cap)
    return Conditions(
        child_id=child_id,
        subjects=found.subjects or base.subjects,
        budget_target=budget[0],
        budget_cap=budget[1],
        types=found.types or base.types,
        days=found.days or base.days,
        density=found.density or base.density,
    )


def reply_text(draft: Conditions, found: extraction.Extracted) -> str:
    """Result first, then what to do (experience 문구 규칙)."""
    parts = []
    if draft.subjects:
        parts.append("·".join(draft.subjects))
    if draft.budget_cap:
        parts.append(f"월 {draft.budget_target:,}원(상한 {draft.budget_cap:,}원)")
    if draft.types:
        parts.append("·".join(PROGRAM_TYPE_LABELS[t] for t in draft.types))
    parts.append(DENSITY_LABELS[draft.density])
    if not (found.subjects or found.budget_amount or found.types or found.days or found.density):
        return "말씀에서 조건을 찾지 못했어요. 조건 카드에서 직접 고쳐 주세요."
    return f"{', '.join(parts)} 조건으로 정리했어요. 맞으면 '조건 저장'을 눌러 주세요."


def _to_api(row: ChildCondition) -> Conditions:
    return Conditions(
        child_id=str(row.child_id),
        subjects=list(row.subjects),
        budget_target=row.budget_target,
        budget_cap=row.budget_cap,
        types=list(row.types),
        days=ints_to_dows(list(row.days)),
        density=row.density,
    )
