"""Subjects for the condition sheet chips (AD-15): every live program's subject, academy and
after-school alike, once each in Python `sorted` order, so a subject an academy adds shows up
without a code change."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Program


async def list_all(db: AsyncSession) -> list[str]:
    rows = await db.scalars(select(Program.subject).where(Program.deleted_at.is_(None)).distinct())
    return sorted(rows)
