"""catalog module tables (written by catalog only): institutions, programs, school_timetables."""

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models._types import created_at, uuid_pk


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[uuid.UUID] = uuid_pk()
    kind: Mapped[str] = mapped_column(String(16))  # academy | school
    name: Mapped[str] = mapped_column(String(100))
    school_level: Mapped[str | None] = mapped_column(String(16))  # elementary | middle (schools)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = created_at()


class Program(Base):
    """An academy course or a school after-school program (institution_id = the school)."""

    __tablename__ = "programs"

    id: Mapped[uuid.UUID] = uuid_pk()
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(16))  # core/vocab.py ProgramType
    subject: Mapped[str] = mapped_column(String(50))
    days: Mapped[list[int]] = mapped_column(ARRAY(Integer))  # 0=mon..6=sun
    start_min: Mapped[int] = mapped_column(Integer)
    end_min: Mapped[int] = mapped_column(Integer)
    monthly_tuition: Mapped[int | None] = mapped_column(Integer)  # NULL = not disclosed, 0 = free
    monthly_other: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    instructor: Mapped[str] = mapped_column(String(50))
    grade_min: Mapped[int] = mapped_column(Integer)
    grade_max: Mapped[int] = mapped_column(Integer)
    capacity: Mapped[int] = mapped_column(Integer)
    enrolled: Mapped[int] = mapped_column(Integer)
    lat: Mapped[float | None] = mapped_column(Float)  # NULL for after-school: school location
    lng: Mapped[float | None] = mapped_column(Float)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # soft delete
    created_at: Mapped[datetime] = created_at()


class SchoolTimetable(Base):
    __tablename__ = "school_timetables"
    __table_args__ = (UniqueConstraint("school_id", "grade", "dow"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE")
    )
    grade: Mapped[int] = mapped_column(Integer)
    dow: Mapped[int] = mapped_column(Integer)
    dismissal_min: Mapped[int] = mapped_column(Integer)
