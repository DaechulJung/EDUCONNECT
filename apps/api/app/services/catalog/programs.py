"""Academy programs (REQ-02, ownership REQ-01). Writes `programs` only (AD-2)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import deny_not_found
from app.core.ids import parse_owned_id
from app.core.session import SessionInfo
from app.core.units import dows_to_ints, hhmm_to_min, ints_to_dows, min_to_hhmm
from app.models.catalog import Program as ProgramRow
from app.schemas.catalog import AfterSchoolIn, Program, ProgramIn


def own_institution(session: SessionInfo) -> uuid.UUID:
    """Staff sessions always carry their institution (seed and login guarantee it)."""
    assert session.institution_id is not None
    return uuid.UUID(session.institution_id)


def apply_fields(row: ProgramRow, body: ProgramIn | AfterSchoolIn) -> None:
    """Copy the API fields shared by academy and after-school programs onto a row (AD-6 units)."""
    row.subject = body.subject.strip()
    row.days = dows_to_ints(body.days)
    row.start_min = hhmm_to_min(body.start)
    row.end_min = hhmm_to_min(body.end)
    row.monthly_tuition = body.monthly_tuition
    row.monthly_other = body.monthly_other
    row.instructor = body.instructor
    row.grade_min = body.grade_min
    row.grade_max = body.grade_max
    row.capacity = body.capacity
    row.enrolled = body.enrolled


def shared_fields(row: ProgramRow) -> dict:
    return {
        "id": str(row.id),
        "institution_id": str(row.institution_id),
        "subject": row.subject,
        "days": ints_to_dows(row.days),
        "start": min_to_hhmm(row.start_min),
        "end": min_to_hhmm(row.end_min),
        "monthly_tuition": row.monthly_tuition,
        "monthly_other": row.monthly_other,
        "instructor": row.instructor,
        "grade_min": row.grade_min,
        "grade_max": row.grade_max,
        "capacity": row.capacity,
        "enrolled": row.enrolled,
    }


def to_api(row: ProgramRow) -> Program:
    return Program(**shared_fields(row), type=row.type, lat=row.lat, lng=row.lng)


async def owned_program(
    db: AsyncSession, session: SessionInfo, program_id: str, target: str
) -> ProgramRow:
    """The session's own live program of a non-after-school type, or audited 404 (AD-8)."""
    pid: uuid.UUID = await parse_owned_id(session, program_id, target)
    row = await db.scalar(
        select(ProgramRow).where(
            ProgramRow.id == pid,
            ProgramRow.institution_id == own_institution(session),
            ProgramRow.type != "after_school",
            ProgramRow.deleted_at.is_(None),
        )
    )
    if row is None:
        await deny_not_found(session, target)
    return row


async def update_program(
    db: AsyncSession, session: SessionInfo, program_id: str, body: ProgramIn
) -> Program:
    row = await owned_program(db, session, program_id, f"/api/academy/programs/{program_id}")
    apply_fields(row, body)
    row.type = body.type
    row.lat = body.lat
    row.lng = body.lng
    await db.commit()
    return to_api(row)
