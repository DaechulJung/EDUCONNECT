"""family module table (written by family only): children. No real name or contact columns."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ARRAY, Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models._types import created_at, uuid_pk


class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = uuid_pk()
    parent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    alias: Mapped[str] = mapped_column(String(20))
    age: Mapped[int] = mapped_column(Integer)
    grade: Mapped[int] = mapped_column(Integer)
    school_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="SET NULL")
    )
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    goal: Mapped[str] = mapped_column(Text, default="", server_default="")
    # [{"dow": 5, "start_min": 600, "end_min": 720, "label": "수영"}]
    existing_events: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    manual_dismissal: Mapped[dict[str, int]] = mapped_column(  # {"<dow>": min}
        JSONB, default=dict, server_default="{}"
    )
    consent_checked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = created_at()
