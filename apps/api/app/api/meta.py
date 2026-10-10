"""Service meta for the header (planner module). 501 until #12 (AD-3)."""

from fastapi import APIRouter

from app.core.errors import error_responses, not_implemented
from app.schemas.meta import Meta

router = APIRouter(tags=["meta"])


@router.get("/meta", responses=error_responses(501))
async def get_meta() -> Meta:
    raise not_implemented()
