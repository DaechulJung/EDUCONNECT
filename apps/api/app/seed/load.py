"""Seed loading and reset (REQ-11, AD-2 exception: writes every table).

The foundation only clears the tables; #11 adds the seed JSON under seed/data/ and loads it.
Rows for children and child_conditions are validated with their owners' Pydantic schemas;
plans are never seeded (tests create them through the API).
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis

TABLES = (
    "plans",
    "child_conditions",
    "children",
    "audit_events",
    "accounts",
    "school_timetables",
    "programs",
    "institutions",
)


async def clear(db: AsyncSession) -> None:
    await db.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
    async for key in redis.scan_iter(match="session:*"):
        await redis.delete(key)


async def load(db: AsyncSession) -> None:
    """Load seed/data/*.json (#11)."""


async def reset(db: AsyncSession) -> None:
    await clear(db)
    await load(db)
    await db.commit()
