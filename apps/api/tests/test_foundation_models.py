"""BASE-01.1: every AD-16 table has a module model, 0002 applies and `alembic check` is clean."""

import subprocess
from pathlib import Path

from sqlalchemy import inspect

from app.core.db import Base

API_DIR = Path(__file__).resolve().parents[1]
TABLES = {
    "accounts": "app.models.auth",
    "audit_events": "app.models.auth",
    "institutions": "app.models.catalog",
    "programs": "app.models.catalog",
    "school_timetables": "app.models.catalog",
    "children": "app.models.family",
    "child_conditions": "app.models.chat",
    "plans": "app.models.planner",
}


def test_every_table_has_a_model_in_its_module() -> None:
    import app.models  # noqa: F401

    mapped = {m.class_.__table__.name: m.class_.__module__ for m in Base.registry.mappers}
    assert {name: mapped.get(name) for name in TABLES} == TABLES


def test_migration_applied_and_alembic_check_is_clean(sync_db) -> None:
    assert set(TABLES) <= set(inspect(sync_db).get_table_names())
    current = subprocess.run(
        ["uv", "run", "alembic", "current"], cwd=API_DIR, capture_output=True, text=True
    )
    assert "(head)" in current.stdout, current.stdout + current.stderr
    check = subprocess.run(
        ["uv", "run", "alembic", "check"], cwd=API_DIR, capture_output=True, text=True
    )
    assert check.returncode == 0, check.stdout + check.stderr
    assert "No new upgrade operations detected" in check.stdout + check.stderr


def test_columns_follow_ad16_shapes(sync_db) -> None:
    columns = {table: {c["name"] for c in inspect(sync_db).get_columns(table)} for table in TABLES}
    assert {
        "institution_id", "type", "subject", "days", "start_min", "end_min", "monthly_tuition",
        "monthly_other", "instructor", "grade_min", "grade_max", "capacity", "enrolled", "lat",
        "lng", "deleted_at",
    } <= columns["programs"]  # fmt: skip
    assert {"school_id", "grade", "dow", "dismissal_min"} <= columns["school_timetables"]
    assert {
        "parent_id", "alias", "age", "grade", "school_id", "interests", "goal",
        "existing_events", "manual_dismissal", "consent_checked",
    } <= columns["children"]  # fmt: skip
    assert not {"name", "real_name", "phone", "contact"} & columns["children"]
    assert {
        "child_id", "subjects", "budget_target", "budget_cap", "types", "days", "density",
    } <= columns["child_conditions"]  # fmt: skip
    assert {
        "child_id", "status", "items", "school_snapshot", "budget_cap", "monthly_total",
        "created_at",
    } <= columns["plans"]  # fmt: skip
    assert {"id", "at", "kind", "account_id", "target"} <= columns["audit_events"]
    assert {"failed_count", "locked_until", "password_hash", "role"} <= columns["accounts"]
