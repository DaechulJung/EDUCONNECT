"""auth module tables: `accounts` (written by auth only) and `audit_events` (core/audit.py only)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models._types import created_at, uuid_pk


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = uuid_pk()
    login_id: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))  # scrypt$<n>$<r>$<p>$<salt>$<hash>
    role: Mapped[str] = mapped_column(String(16))  # parent | academy | school
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="SET NULL")
    )
    failed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at()


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    account_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)  # no FK: unknown login ids too
    target: Mapped[str] = mapped_column(String(300))
