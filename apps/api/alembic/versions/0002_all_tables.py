"""all tables (AD-16): foundation contract, later changes add new revisions per owning module

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-10 17:18:57.729063
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("target", sa.String(length=300), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_events_at"), "audit_events", ["at"], unique=False)
    op.create_table(
        "institutions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("school_level", sa.String(length=16), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("login_id", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=True),
        sa.Column("failed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("login_id"),
    )
    op.create_table(
        "programs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("subject", sa.String(length=50), nullable=False),
        sa.Column("days", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("start_min", sa.Integer(), nullable=False),
        sa.Column("end_min", sa.Integer(), nullable=False),
        sa.Column("monthly_tuition", sa.Integer(), nullable=True),
        sa.Column("monthly_other", sa.Integer(), server_default="0", nullable=False),
        sa.Column("instructor", sa.String(length=50), nullable=False),
        sa.Column("grade_min", sa.Integer(), nullable=False),
        sa.Column("grade_max", sa.Integer(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("enrolled", sa.Integer(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_programs_institution_id"), "programs", ["institution_id"], unique=False
    )
    op.create_table(
        "school_timetables",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("grade", sa.Integer(), nullable=False),
        sa.Column("dow", sa.Integer(), nullable=False),
        sa.Column("dismissal_min", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "grade", "dow"),
    )
    op.create_table(
        "children",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=False),
        sa.Column("alias", sa.String(length=20), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("grade", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Uuid(), nullable=True),
        sa.Column("interests", sa.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("goal", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "existing_events",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column(
            "manual_dismissal",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("consent_checked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["parent_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["school_id"], ["institutions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_children_parent_id"), "children", ["parent_id"], unique=False)
    op.create_table(
        "child_conditions",
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("subjects", sa.ARRAY(sa.Text()), nullable=False),
        sa.Column("budget_target", sa.Integer(), nullable=False),
        sa.Column("budget_cap", sa.Integer(), nullable=False),
        sa.Column("types", sa.ARRAY(sa.Text()), nullable=False),
        sa.Column("days", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("density", sa.String(length=16), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("child_id"),
    )
    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "school_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("budget_cap", sa.Integer(), nullable=False),
        sa.Column("monthly_total", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_plans_child_id"), "plans", ["child_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_plans_child_id"), table_name="plans")
    op.drop_table("plans")
    op.drop_table("child_conditions")
    op.drop_index(op.f("ix_children_parent_id"), table_name="children")
    op.drop_table("children")
    op.drop_table("school_timetables")
    op.drop_index(op.f("ix_programs_institution_id"), table_name="programs")
    op.drop_table("programs")
    op.drop_table("accounts")
    op.drop_table("institutions")
    op.drop_index(op.f("ix_audit_events_at"), table_name="audit_events")
    op.drop_table("audit_events")
