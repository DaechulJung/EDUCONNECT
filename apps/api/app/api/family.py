"""family routes: the parent's own children. Bodies are 501 until #4 implements them (AD-3)."""

from fastapi import APIRouter, status

from app.core.authz import Parent
from app.core.errors import error_responses, not_implemented
from app.schemas.family import Child, ChildIn

router = APIRouter(tags=["family"])


@router.get("/children", responses=error_responses(401, 403, 501))
async def list_children(session: Parent) -> list[Child]:
    raise not_implemented()


@router.post(
    "/children", status_code=status.HTTP_201_CREATED, responses=error_responses(401, 403, 422, 501)
)
async def create_child(body: ChildIn, session: Parent) -> Child:
    raise not_implemented()


@router.get("/children/{child_id}", responses=error_responses(401, 403, 404, 501))
async def get_child(child_id: str, session: Parent) -> Child:
    raise not_implemented()


@router.put("/children/{child_id}", responses=error_responses(401, 403, 404, 422, 501))
async def update_child(child_id: str, body: ChildIn, session: Parent) -> Child:
    raise not_implemented()
