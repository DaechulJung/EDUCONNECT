"""Schools for the children form (#4, experience 자녀 등록 폼): seed schools, id and name only."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Institution
from app.schemas.catalog import School


async def list_all(db: AsyncSession) -> list[School]:
    rows = await db.scalars(
        select(Institution)
        .where(Institution.kind == "school")
        .order_by(Institution.name.collate("C"), Institution.id)  # 가나다 order, not the DB locale
    )
    return [School(id=str(row.id), name=row.name) for row in rows]
