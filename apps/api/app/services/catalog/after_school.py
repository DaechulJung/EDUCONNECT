"""School after-school programs (REQ-03, ownership REQ-01). `institution_id` is the school and
the location is the school's (AD-16). Writes `programs` only (AD-2)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.authz import deny_not_found
from app.core.errors import AppError
from app.core.ids import parse_owned_id
from app.core.session import SessionInfo
from app.core.units import dows_to_ints, hhmm_to_min
from app.models.catalog import Institution
from app.models.catalog import Program as ProgramRow
from app.schemas.catalog import AfterSchoolIn, AfterSchoolProgram
from app.services.catalog.programs import apply_fields, own_institution, shared_fields


def to_api(row: ProgramRow, school: Institution) -> AfterSchoolProgram:
    return AfterSchoolProgram(
        **shared_fields(row),
        lat=row.lat if row.lat is not None else school.lat,
        lng=row.lng if row.lng is not None else school.lng,
    )


def _live(school_id: uuid.UUID):
    return select(ProgramRow).where(
        ProgramRow.institution_id == school_id,
        ProgramRow.type == "after_school",
        ProgramRow.deleted_at.is_(None),
    )


async def _owned(db: AsyncSession, session: SessionInfo, program_id: str) -> ProgramRow:
    """The session school's own live after-school program, or audited 404 (AD-8)."""
    target = f"/api/school/after-school/{program_id}"
    pid = await parse_owned_id(session, program_id, target)
    row = await db.scalar(_live(own_institution(session)).where(ProgramRow.id == pid))
    if row is None:
        await deny_not_found(session, target)
    return row


async def _reject_overlap(
    db: AsyncSession, school_id: uuid.UUID, body: AfterSchoolIn, exclude: uuid.UUID | None = None
) -> None:
    """AC-03.4: another live program of the same school sharing a grade and a weekday must not
    overlap in time. Touching ends (15:00 end, 15:00 start) do not overlap.

    The school row is locked first, so writes of one school run one at a time until commit and two
    concurrent overlapping writes cannot both pass this check (PR #26 P2)."""
    await db.execute(select(Institution.id).where(Institution.id == school_id).with_for_update())
    start, end, days = hhmm_to_min(body.start), hhmm_to_min(body.end), set(dows_to_ints(body.days))
    query = _live(school_id).where(
        ProgramRow.grade_min <= body.grade_max,
        ProgramRow.grade_max >= body.grade_min,
        ProgramRow.start_min < end,
        ProgramRow.end_min > start,
    )
    if exclude is not None:
        query = query.where(ProgramRow.id != exclude)
    for other in await db.scalars(query):
        if days & set(other.days):
            raise AppError(422, "time_overlap", {"program_id": str(other.id)})


async def list_own(db: AsyncSession, session: SessionInfo) -> list[AfterSchoolProgram]:
    school_id = own_institution(session)
    school = await db.get(Institution, school_id)
    rows = await db.scalars(_live(school_id).order_by(ProgramRow.created_at, ProgramRow.id))
    return [to_api(row, school) for row in rows]


async def create(db: AsyncSession, session: SessionInfo, body: AfterSchoolIn) -> AfterSchoolProgram:
    school_id = own_institution(session)
    await _reject_overlap(db, school_id, body)
    row = ProgramRow(institution_id=school_id, type="after_school")
    apply_fields(row, body)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return to_api(row, await db.get(Institution, school_id))


async def update(
    db: AsyncSession, session: SessionInfo, program_id: str, body: AfterSchoolIn
) -> AfterSchoolProgram:
    row = await _owned(db, session, program_id)
    await _reject_overlap(db, row.institution_id, body, exclude=row.id)
    apply_fields(row, body)
    await db.commit()
    return to_api(row, await db.get(Institution, row.institution_id))


async def delete(db: AsyncSession, session: SessionInfo, program_id: str) -> None:
    """Soft delete like academy programs: confirmed plans keep reading the row (AD-4)."""
    row = await _owned(db, session, program_id)
    row.deleted_at = clock.now()
    await db.commit()
