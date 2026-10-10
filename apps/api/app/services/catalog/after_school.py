"""School after-school programs (REQ-03, ownership REQ-01). `institution_id` is the school and
the location is the school's (AD-16). Writes `programs` only (AD-2)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import deny_not_found
from app.core.ids import parse_owned_id
from app.core.session import SessionInfo
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


async def update(
    db: AsyncSession, session: SessionInfo, program_id: str, body: AfterSchoolIn
) -> AfterSchoolProgram:
    target = f"/api/school/after-school/{program_id}"
    pid = await parse_owned_id(session, program_id, target)
    school_id = own_institution(session)
    row = await db.scalar(
        select(ProgramRow).where(
            ProgramRow.id == pid,
            ProgramRow.institution_id == school_id,
            ProgramRow.type == "after_school",
            ProgramRow.deleted_at.is_(None),
        )
    )
    if row is None:
        await deny_not_found(session, target)
    apply_fields(row, body)
    await db.commit()
    school = await db.get(Institution, school_id)
    return to_api(row, school)
