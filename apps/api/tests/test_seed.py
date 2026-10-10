"""REQ-11 seed (TC-63~66): counts and fields after a reset, demo children, reset command.

Every test starts from POST /api/test/reset, so the seed state is the same whatever ran before.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.main import create_app
from app.seed import load
from tests.conftest import TEST_PASSWORD, login

API_DIR = Path(__file__).resolve().parents[1]
PROGRAM_FIELDS = (
    "subject",
    "type",
    "days",
    "start_min",
    "end_min",
    "monthly_tuition",
    "monthly_other",
    "instructor",
    "grade_min",
    "grade_max",
    "capacity",
    "enrolled",
    "lat",
    "lng",
)
SEED_COUNTS = {"institutions": 7, "accounts": 9, "children": 2, "plans": 0, "child_conditions": 0}


@pytest.fixture(scope="module")
def seeded() -> TestClient:
    with TestClient(create_app(Settings(enable_test_routes=True))) as client:
        yield client


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def fetch(sync_db, sql: str) -> list[dict]:
    with sync_db.connect() as conn:
        return [dict(row._mapping) for row in conn.execute(text(sql))]


def counts(sync_db) -> dict[str, int]:
    return {
        table: fetch(sync_db, f"SELECT count(*) AS n FROM {table}")[0]["n"]
        for table in [*SEED_COUNTS, "programs", "school_timetables"]
    }


def test_ac_11_1_schools_academies_and_subjects(sync_db) -> None:
    institutions = fetch(sync_db, "SELECT id, kind, school_level FROM institutions")
    schools = [i for i in institutions if i["kind"] == "school"]
    assert sorted(s["school_level"] for s in schools) == ["elementary", "middle"]
    assert sum(i["kind"] == "academy" for i in institutions) == 5

    for school in schools:
        grades = range(1, 7) if school["school_level"] == "elementary" else range(7, 10)
        timetable = fetch(
            sync_db, f"SELECT grade, dow FROM school_timetables WHERE school_id = '{school['id']}'"
        )
        assert {row["grade"] for row in timetable} == set(grades)  # every grade has a timetable
        assert all(
            {0, 1, 2, 3, 4} <= {r["dow"] for r in timetable if r["grade"] == g} for g in grades
        )
        after_school = fetch(
            sync_db,
            f"SELECT type FROM programs WHERE institution_id = '{school['id']}'",
        )
        assert after_school and {p["type"] for p in after_school} == {"after_school"}

    academy_programs = fetch(
        sync_db,
        "SELECT p.subject, p.type FROM programs p JOIN institutions i ON i.id = p.institution_id"
        " WHERE i.kind = 'academy'",
    )
    assert {"영어", "수학"} <= {p["subject"] for p in academy_programs}
    assert {"arts", "other"} <= {p["type"] for p in academy_programs}  # 예체능·기타 1개 이상


def test_ac_11_2_program_fields_with_two_exceptions(sync_db) -> None:
    programs = fetch(sync_db, f"SELECT {', '.join(PROGRAM_FIELDS)} FROM programs")
    empty = [
        [field for field in PROGRAM_FIELDS if p[field] is None or p[field] == [] or p[field] == ""]
        for p in programs
    ]
    # the only missing value in the whole seed is the undisclosed program's monthly tuition
    assert sorted(fields for fields in empty if fields) == [["monthly_tuition"]]
    assert sum(p["enrolled"] >= p["capacity"] for p in programs) == 1  # one closed program
    assert all(p["enrolled"] <= p["capacity"] for p in programs)
    assert all(p["start_min"] < p["end_min"] for p in programs)
    # test programs named by REQ-11: a closed English one and a math one for 중1 only
    closed = [p for p in programs if p["enrolled"] == p["capacity"]]
    assert closed[0]["subject"] == "영어" and closed[0]["monthly_tuition"] is not None
    assert any(p["subject"] == "수학" and p["grade_min"] == p["grade_max"] == 7 for p in programs)


def test_ac_11_3_demo_children_one_per_school(sync_db) -> None:
    children = fetch(
        sync_db,
        "SELECT c.grade, c.school_id, i.school_level, a.role FROM children c"
        " JOIN institutions i ON i.id = c.school_id JOIN accounts a ON a.id = c.parent_id",
    )
    assert sorted((c["grade"], c["school_level"]) for c in children) == [
        (5, "elementary"),
        (7, "middle"),
    ]
    assert len({c["school_id"] for c in children}) == 2
    assert {c["role"] for c in children} == {"parent"}


def test_seed_accounts_roles_and_login(sync_db, seeded: TestClient) -> None:
    accounts = fetch(sync_db, "SELECT login_id, role, institution_id, password_hash FROM accounts")
    roles = [a["role"] for a in accounts]
    assert roles.count("parent") == 2 and roles.count("academy") >= 2 and roles.count("school") == 2
    assert all((a["institution_id"] is None) == (a["role"] == "parent") for a in accounts)
    assert all(
        a["password_hash"].startswith("scrypt$") and TEST_PASSWORD not in a["password_hash"]
        for a in accounts
    )
    for login_id, role in [
        ("parent1", "parent"),
        ("academy-a", "academy"),
        ("school-elem", "school"),
    ]:
        response = login(seeded, login_id)
        assert response.status_code == 200, login_id
        assert seeded.get("/api/auth/me").json()["role"] == role


def test_seed_ids_are_stable(sync_db, seeded: TestClient) -> None:
    before = fetch(sync_db, "SELECT id FROM programs ORDER BY id")
    seeded.post("/api/test/reset")
    assert fetch(sync_db, "SELECT id FROM programs ORDER BY id") == before
    assert str(load.seed_id("academy-a")) in {
        str(r["id"]) for r in fetch(sync_db, "SELECT id FROM institutions")
    }


def test_ac_11_4_reset_command_removes_test_data(sync_db) -> None:
    seed = counts(sync_db)
    assert {table: seed[table] for table in SEED_COUNTS} == SEED_COUNTS
    child = str(load.seed_id("child-elem5"))
    academy = str(load.seed_id("academy-a"))
    with sync_db.begin() as conn:  # what earlier tests leave behind: a program and a plan
        conn.execute(
            text(
                "INSERT INTO programs (id, institution_id, type, subject, days, start_min, end_min,"
                " monthly_tuition, monthly_other, instructor, grade_min, grade_max, capacity,"
                " enrolled, lat, lng) VALUES (gen_random_uuid(), :academy, 'academy', '코딩',"
                " '{1}', 900, 960, 100000, 0, '시험', 1, 9, 5, 0, 37.5, 127.0)"
            ),
            {"academy": academy},
        )
        conn.execute(
            text(
                "INSERT INTO plans (id, child_id, status, items, budget_cap, monthly_total)"
                " VALUES (gen_random_uuid(), :child, 'confirmed', '[]', 0, 0)"
            ),
            {"child": child},
        )
    assert counts(sync_db) != seed

    result = subprocess.run(
        [sys.executable, "-m", "app.seed", "--reset"],
        cwd=API_DIR,
        env=os.environ | {"SEED_PASSWORD": TEST_PASSWORD},
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert TEST_PASSWORD not in result.stdout + result.stderr
    assert counts(sync_db) == seed


def test_seed_command_refuses_a_seeded_database_and_an_empty_password(tmp_path: Path) -> None:
    def run(password: str) -> subprocess.CompletedProcess[str]:
        # Outside apps/api, so a developer's .env cannot fill the empty SEED_PASSWORD back in.
        # The .env DB_PORT is not read there either, so pass the test database address explicitly.
        env = {"SEED_PASSWORD": password, "PYTHONPATH": str(API_DIR)}
        env |= {"DATABASE_URL": load.settings.database_url, "REDIS_URL": load.settings.redis_url}
        return subprocess.run(
            [sys.executable, "-m", "app.seed"],
            cwd=tmp_path,
            env=os.environ | env,
            capture_output=True,
            text=True,
        )

    seeded_db = run(TEST_PASSWORD)
    assert seeded_db.returncode == 1 and "--reset" in seeded_db.stderr
    no_password = run("")
    assert no_password.returncode == 1 and "SEED_PASSWORD" in no_password.stderr


def test_reset_without_password_keeps_sessions(
    seeded: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # The password is checked before clearing: Redis deletes would survive the DB rollback
    assert login(seeded, "parent1").status_code == 200
    monkeypatch.setattr(load.settings, "seed_password", "")
    with pytest.raises(load.SeedPasswordMissing):
        seeded.post("/api/test/reset")
    monkeypatch.undo()
    assert seeded.get("/api/auth/me").status_code == 200
