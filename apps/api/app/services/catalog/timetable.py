"""School dismissal times by grade and weekday (REQ-03, ownership REQ-01). Only the session's
own school is ever read or written (AD-8). Writes `school_timetables` only (AD-2)."""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.session import SessionInfo
from app.core.units import dow_to_int, hhmm_to_min, int_to_dow, min_to_hhmm
from app.models.catalog import SchoolTimetable as TimetableRow
from app.schemas.catalog import SchoolTimetable, TimetableEntry, TimetableUpdate
from app.services.catalog.programs import own_institution


async def get_own(db: AsyncSession, session: SessionInfo) -> SchoolTimetable:
    school_id = own_institution(session)
    rows = await db.scalars(
        select(TimetableRow)
        .where(TimetableRow.school_id == school_id)
        .order_by(TimetableRow.grade, TimetableRow.dow)
    )
    entries = [
        TimetableEntry(grade=r.grade, dow=int_to_dow(r.dow), dismissal=min_to_hhmm(r.dismissal_min))
        for r in rows
    ]
    return SchoolTimetable(school_id=str(school_id), entries=entries)


async def update_own(
    db: AsyncSession, session: SessionInfo, body: TimetableUpdate
) -> SchoolTimetable:
    """Upsert by (grade, dow) for the session's school; unlisted rows stay as they are."""
    school_id = own_institution(session)
    for entry in body.entries:
        stmt = insert(TimetableRow).values(
            school_id=school_id,
            grade=entry.grade,
            dow=dow_to_int(entry.dow),
            dismissal_min=hhmm_to_min(entry.dismissal),
        )
        await db.execute(
            stmt.on_conflict_do_update(
                index_elements=["school_id", "grade", "dow"],
                set_={"dismissal_min": stmt.excluded.dismissal_min},
            )
        )
    await db.commit()
    return await get_own(db, session)
