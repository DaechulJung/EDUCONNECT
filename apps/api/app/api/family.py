"""family routes: the parent's own children. The list serves the chat screen (#5) and the update
the interests for recommendations (#6); create and read one are 501 until #4 and #1 (AD-3)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import Parent, deny_not_found
from app.core.db import get_session
from app.core.errors import error_responses, not_implemented
from app.schemas.family import Child, ChildIn
from app.services.family import children

router = APIRouter(tags=["family"])


@router.get("/children", responses=error_responses(401, 403))
async def list_children(
    session: Parent, db: Annotated[AsyncSession, Depends(get_session)]
) -> list[Child]:
    return await children.list_own(db, session.account_id)


@router.post(
    "/children", status_code=status.HTTP_201_CREATED, responses=error_responses(401, 403, 422, 501)
)
async def create_child(body: ChildIn, session: Parent) -> Child:
    raise not_implemented()


@router.get("/children/{child_id}", responses=error_responses(401, 403, 404, 501))
async def get_child(child_id: str, session: Parent) -> Child:
    raise not_implemented()


@router.put("/children/{child_id}", responses=error_responses(401, 403, 404, 422))
async def update_child(
    child_id: str, body: ChildIn, session: Parent, db: Annotated[AsyncSession, Depends(get_session)]
) -> Child:
    try:
        return await children.update_own(db, session.account_id, child_id, body)
    except children.NotOwned:
        await deny_not_found(session, f"/api/children/{child_id}")
