"""catalog routes: academy programs, school timetable and after-school programs, subjects.

Academy programs are complete (#1 ownership, #2 list/create/delete). The after-school update and
the timetable read/update carry REQ-01 ownership (#1); the other school bodies are 501 until #3.
Subjects (AD-15) were left 501 after #5 closed and are filled in by the preview fix (Refs #5).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import AcademyStaff, AnyUser, Parent, SchoolStaff
from app.core.db import get_session
from app.core.errors import error_responses, not_implemented
from app.schemas.catalog import (
    AfterSchoolIn,
    AfterSchoolProgram,
    Program,
    ProgramIn,
    School,
    SchoolTimetable,
    TimetableUpdate,
)
from app.services.catalog import after_school, programs, schools, subjects, timetable

Db = Annotated[AsyncSession, Depends(get_session)]

router = APIRouter(tags=["catalog"])
OWNED = error_responses(401, 403, 404, 501)


@router.get("/academy/programs", responses=error_responses(401, 403))
async def list_programs(session: AcademyStaff, db: Db) -> list[Program]:
    return await programs.list_own(db, session)


@router.post(
    "/academy/programs",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 422),
)
async def create_program(body: ProgramIn, session: AcademyStaff, db: Db) -> Program:
    return await programs.create_program(db, session, body)


@router.put("/academy/programs/{program_id}", responses=error_responses(401, 403, 404, 422))
async def update_program(
    program_id: str, body: ProgramIn, session: AcademyStaff, db: Db
) -> Program:
    return await programs.update_program(db, session, program_id, body)


@router.delete(
    "/academy/programs/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(401, 403, 404),
)
async def delete_program(program_id: str, session: AcademyStaff, db: Db) -> None:
    await programs.delete_program(db, session, program_id)


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


@router.get("/catalog/subjects", responses=error_responses(401))
async def list_subjects(session: AnyUser, db: Db) -> list[str]:
    return await subjects.list_all(db)


@router.get("/catalog/schools", responses=error_responses(401, 403))
async def list_schools(session: Parent, db: Db) -> list[School]:
    return await schools.list_all(db)
