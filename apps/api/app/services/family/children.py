"""family service: the parent's children (REQ-04). The list serves the chat screen (#5); reading
one child checks ownership (REQ-01, #1); the update serves the interests that recommendations send
to the model (#6, AC-06.4). Create and the children screen come with #4."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import deny_not_found
from app.core.errors import AppError
from app.core.ids import parse_owned_id
from app.core.session import SessionInfo
from app.core.units import (
    dismissal_to_api,
    dismissal_to_db,
    dow_to_int,
    hhmm_to_min,
    int_to_dow,
    min_to_hhmm,
)
from app.models.catalog import Institution
from app.models.family import Child as ChildRow
from app.schemas.family import Child, ChildIn, ExistingEvent

CONSENT_AGE = 14  # under 14 needs the guardian consent check (SEC-07)


async def list_own(db: AsyncSession, parent_id: str) -> list[Child]:
    rows = await db.scalars(
        select(ChildRow)
        .where(ChildRow.parent_id == uuid.UUID(parent_id))
        .order_by(ChildRow.created_at, ChildRow.id)
    )
    return [to_api(row) for row in rows]


async def get_own(db: AsyncSession, session: SessionInfo, child_id: str) -> Child:
    return to_api(await _own_row(db, session, child_id))


async def update_own(db: AsyncSession, session: SessionInfo, child_id: str, body: ChildIn) -> Child:
    """Replace the child's fields. 422 consent_required under 14 without the consent check."""
    row = await _own_row(db, session, child_id)
    if body.age < CONSENT_AGE and not body.consent_checked:
        raise AppError(422, "consent_required")
    row.school_id = await _school(db, body.school_id)
    row.alias = body.alias
    row.age = body.age
    row.grade = body.grade
    row.interests = body.interests
    row.goal = body.goal
    row.existing_events = [
        {
            "dow": dow_to_int(event.dow),
            "start_min": hhmm_to_min(event.start),
            "end_min": hhmm_to_min(event.end),
            "label": event.label,
        }
        for event in body.existing_events
    ]
    row.manual_dismissal = dismissal_to_db(body.manual_dismissal)
    row.consent_checked = body.consent_checked
    await db.commit()
    return to_api(row)


async def _own_row(db: AsyncSession, session: SessionInfo, child_id: str) -> ChildRow:
    """The session parent's own child row, or audited 404 that never reveals another's (AD-8)."""
    target = f"/api/children/{child_id}"
    cid = await parse_owned_id(session, child_id, target)
    row = await db.scalar(
        select(ChildRow).where(
            ChildRow.id == cid, ChildRow.parent_id == uuid.UUID(session.account_id)
        )
    )
    if row is None:
        await deny_not_found(session, target)
    return row


def to_api(row: ChildRow) -> Child:
    return Child(
        id=str(row.id),
        alias=row.alias,
        age=row.age,
        grade=row.grade,
        school_id=str(row.school_id) if row.school_id else None,
        interests=list(row.interests or []),
        goal=row.goal or "",
        existing_events=[
            ExistingEvent(
                dow=int_to_dow(e["dow"]),
                start=min_to_hhmm(e["start_min"]),
                end=min_to_hhmm(e["end_min"]),
                label=e["label"],
            )
            for e in row.existing_events or []
        ],
        manual_dismissal=dismissal_to_api(row.manual_dismissal),
        consent_checked=row.consent_checked,
    )


async def _school(db: AsyncSession, school_id: str | None) -> uuid.UUID | None:
    if school_id is None:
        return None
    try:
        school = await db.get(Institution, uuid.UUID(school_id))
    except ValueError:
        school = None
    if school is None or school.kind != "school":
        raise AppError(422, "invalid_school")
    return school.id
