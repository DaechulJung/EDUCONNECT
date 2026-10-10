"""catalog routes: academy programs, school timetable and after-school programs, subjects.

The owned updates (academy program, after-school program, timetable) and the timetable read are
implemented with REQ-01 ownership (#1). The other bodies are 501 until #2 (academy), #3 (school)
and #5 (subjects) implement them (AD-3).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import AcademyStaff, AnyUser, SchoolStaff
from app.core.db import get_session
from app.core.errors import error_responses, not_implemented
from app.schemas.catalog import (
    AfterSchoolIn,
    AfterSchoolProgram,
    Program,
    ProgramIn,
    SchoolTimetable,
    TimetableUpdate,
)
from app.services.catalog import after_school, programs, timetable

Db = Annotated[AsyncSession, Depends(get_session)]

router = APIRouter(tags=["catalog"])
OWNED = error_responses(401, 403, 404, 501)


@router.get("/academy/programs", responses=error_responses(401, 403, 501))
async def list_programs(session: AcademyStaff) -> list[Program]:
    raise not_implemented()


@router.post(
    "/academy/programs",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 501),
)
async def create_program(body: ProgramIn, session: AcademyStaff) -> Program:
    raise not_implemented()


@router.put("/academy/programs/{program_id}", responses=error_responses(401, 403, 404, 422))
async def update_program(
    program_id: str, body: ProgramIn, session: AcademyStaff, db: Db
) -> Program:
    return await programs.update_program(db, session, program_id, body)


@router.delete(
    "/academy/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT, responses=OWNED
)
async def delete_program(program_id: str, session: AcademyStaff) -> None:
    raise not_implemented()


@router.get("/school/timetable", responses=error_responses(401, 403))
async def get_timetable(session: SchoolStaff, db: Db) -> SchoolTimetable:
    return await timetable.get_own(db, session)


@router.put("/school/timetable", responses=error_responses(401, 403, 422))
async def update_timetable(body: TimetableUpdate, session: SchoolStaff, db: Db) -> SchoolTimetable:
    return await timetable.update_own(db, session, body)


@router.get("/school/after-school", responses=error_responses(401, 403, 501))
async def list_after_school(session: SchoolStaff) -> list[AfterSchoolProgram]:
    raise not_implemented()


@router.post(
    "/school/after-school",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 422, 501),
)
async def create_after_school(body: AfterSchoolIn, session: SchoolStaff) -> AfterSchoolProgram:
    raise not_implemented()


@router.put("/school/after-school/{program_id}", responses=error_responses(401, 403, 404, 422))
async def update_after_school(
    program_id: str, body: AfterSchoolIn, session: SchoolStaff, db: Db
) -> AfterSchoolProgram:
    return await after_school.update(db, session, program_id, body)


@router.delete(
    "/school/after-school/{program_id}", status_code=status.HTTP_204_NO_CONTENT, responses=OWNED
)
async def delete_after_school(program_id: str, session: SchoolStaff) -> None:
    raise not_implemented()


@router.get("/catalog/subjects", responses=error_responses(401, 501))
async def list_subjects(session: AnyUser) -> list[str]:
    raise not_implemented()
