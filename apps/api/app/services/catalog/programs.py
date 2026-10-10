"""Academy programs (REQ-02, ownership REQ-01). Writes `programs` only (AD-2)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
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


async def list_own(db: AsyncSession, session: SessionInfo) -> list[Program]:
    """The session academy's live programs, oldest first (deleted ones stay for plans, AD-4)."""
    rows = await db.scalars(
        select(ProgramRow)
        .where(
            ProgramRow.institution_id == own_institution(session),
            ProgramRow.type != "after_school",
            ProgramRow.deleted_at.is_(None),
        )
        .order_by(ProgramRow.created_at, ProgramRow.id)
    )
    return [to_api(row) for row in rows]


async def create_program(db: AsyncSession, session: SessionInfo, body: ProgramIn) -> Program:
    row = ProgramRow(
        institution_id=own_institution(session), type=body.type, lat=body.lat, lng=body.lng
    )
    apply_fields(row, body)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return to_api(row)


async def delete_program(db: AsyncSession, session: SessionInfo, program_id: str) -> None:
    """Soft delete: confirmed plans keep reading the row and report it as changed (AD-4)."""
    row = await owned_program(db, session, program_id, f"/api/academy/programs/{program_id}")
    row.deleted_at = clock.now()
    await db.commit()
