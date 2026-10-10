"""planner module table (written by planner only): plans with the confirmation snapshot (AD-4)."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models._types import created_at, uuid_pk


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(16))  # draft | confirmed | superseded
    # [{"program_id", "days", "start_min", "end_min", "monthly_tuition", "monthly_other",
    #   "subject"}]
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    school_snapshot: Mapped[dict[str, int]] = mapped_column(  # {"<dow>": dismissal min}
        JSONB, default=dict, server_default="{}"
    )
    budget_cap: Mapped[int] = mapped_column(Integer)
    monthly_total: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = created_at()
