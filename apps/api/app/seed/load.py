"""Seed loading and reset (REQ-11, AD-2 exception: writes every table).

The foundation only clears the tables; #11 adds the seed JSON under seed/data/ and loads it.
Rows for children and child_conditions are validated with their owners' Pydantic schemas;
plans are never seeded (tests create them through the API).
`clear` refuses to touch a database that is not EDUCONNECT's and deletes only this app's Redis keys
(core/safety.py), so a seed reset pointed at another project's ports changes nothing there.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis
from app.core.safety import assert_own_database
from app.core.session import SESSION_PREFIX

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
    await assert_own_database(db)  # before any write: raises ForeignDatabase, nothing cleared
    await db.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
    async for key in redis.scan_iter(match=f"{SESSION_PREFIX}*"):
        await redis.delete(key)


async def load(db: AsyncSession) -> None:
    """Load seed/data/*.json (#11)."""


async def reset(db: AsyncSession) -> None:
    await clear(db)
    await load(db)
    await db.commit()
