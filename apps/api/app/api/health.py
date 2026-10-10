from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import redis

router = APIRouter(tags=["health"])


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    db: bool
    redis: bool
    vector: str | None  # installed pgvector version; None until `alembic upgrade head`


@router.get("/health", responses={503: {"model": Health}})
async def health(
    response: Response, session: Annotated[AsyncSession, Depends(get_session)]
) -> Health:
    db_ok = redis_ok = False
    vector = None
    # Report each dependency instead of failing the request, so the page can show what is down.
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
        vector = await session.scalar(
            text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        )
    except Exception:
        pass
    try:
        redis_ok = bool(await redis.ping())
    except Exception:
        pass
    ok = db_ok and redis_ok and vector is not None
    if not ok:
        response.status_code = 503
    return Health(status="ok" if ok else "degraded", db=db_ok, redis=redis_ok, vector=vector)
