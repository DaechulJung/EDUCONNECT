"""chat module table (written by chat only): child_conditions, one row per child."""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ChildCondition(Base):
    __tablename__ = "child_conditions"

    child_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("children.id", ondelete="CASCADE"), primary_key=True
    )
    subjects: Mapped[list[str]] = mapped_column(ARRAY(Text))
    budget_target: Mapped[int] = mapped_column(Integer)
    budget_cap: Mapped[int] = mapped_column(Integer)
    types: Mapped[list[str]] = mapped_column(ARRAY(Text))  # empty = any type
    days: Mapped[list[int]] = mapped_column(ARRAY(Integer))  # empty = any day
    density: Mapped[str] = mapped_column(String(16))  # tight | normal
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
