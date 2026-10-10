"""family service: the parent's children (REQ-04). Only the list exists so far; the chat screen
needs it (#5). Create, read one and update come with #4."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.units import dismissal_to_api, int_to_dow, min_to_hhmm
from app.models.family import Child as ChildRow
from app.schemas.family import Child, ExistingEvent


async def list_own(db: AsyncSession, parent_id: str) -> list[Child]:
    rows = await db.scalars(
        select(ChildRow)
        .where(ChildRow.parent_id == uuid.UUID(parent_id))
        .order_by(ChildRow.created_at, ChildRow.id)
    )
    return [to_api(row) for row in rows]


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
