"""REQ-01 ownership on the seed (TC-03~05): someone else's resource is 404 and stays as it was,
a role that does not fit is 403, and the owner's own change goes through.

Every test starts from POST /api/test/reset. Audit rows for these denials are checked in TC-76.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.seed.load import seed_id
from tests.conftest import login

PROGRAM = {
    "subject": "수학", "type": "academy", "days": ["tue", "thu"], "start": "17:00",
    "end": "18:30", "monthly_tuition": 210000, "monthly_other": 0, "instructor": "시험 강사",
    "grade_min": 4, "grade_max": 6, "capacity": 12, "enrolled": 3, "lat": 37.51, "lng": 127.02,
}  # fmt: skip
AFTER_SCHOOL = {k: v for k, v in PROGRAM.items() if k not in ("type", "lat", "lng")}


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def program_row(sync_db, key: str) -> dict:
    with sync_db.connect() as conn:
        row = conn.execute(
            text("SELECT * FROM programs WHERE id = :id"), {"id": seed_id(key)}
        ).one()
    return dict(row._mapping)


def timetable(sync_db, school_key: str) -> list[tuple]:
    with sync_db.connect() as conn:
        return conn.execute(
            text(
                "SELECT grade, dow, dismissal_min FROM school_timetables"
                " WHERE school_id = :id ORDER BY grade, dow"
            ),
            {"id": seed_id(school_key)},
        ).all()


def test_tc03_academy_a_cannot_touch_academy_b(sync_db, seeded: TestClient) -> None:
    other_before = program_row(sync_db, "b-elem-math")
    assert login(seeded, "academy-a").status_code == 200

    denied = seeded.put(f"/api/academy/programs/{seed_id('b-elem-math')}", json=PROGRAM)
    assert denied.status_code == 404
    assert denied.json() == {"detail": "not_found"}
    assert program_row(sync_db, "b-elem-math") == other_before

    own = seeded.put(f"/api/academy/programs/{seed_id('a-elem-math')}", json=PROGRAM)
    assert own.status_code == 200
    body = own.json()
    assert body["id"] == str(seed_id("a-elem-math"))
    assert body["institution_id"] == str(seed_id("academy-a"))
    assert {k: body[k] for k in PROGRAM} == PROGRAM
    row = program_row(sync_db, "a-elem-math")
    assert (row["start_min"], row["end_min"], row["days"]) == (17 * 60, 18 * 60 + 30, [1, 3])


def test_tc03_malformed_or_after_school_id_is_also_404(seeded: TestClient) -> None:
    assert login(seeded, "academy-a").status_code == 200
    for program_id in ("not-a-uuid", seed_id("elem-robot")):
        response = seeded.put(f"/api/academy/programs/{program_id}", json=PROGRAM)
        assert response.status_code == 404, program_id


def test_tc04_parent1_cannot_read_parent2_child(seeded: TestClient) -> None:
    assert login(seeded, "parent1").status_code == 200

    denied = seeded.get(f"/api/children/{seed_id('child-mid1')}")
    assert denied.status_code == 404
    assert "바다" not in denied.text

    own = seeded.get(f"/api/children/{seed_id('child-elem5')}")
    assert own.status_code == 200
    assert own.json()["alias"] == "하늘"
    assert own.json()["grade"] == 5


def test_tc05_school_staff_and_parent_boundaries(sync_db, seeded: TestClient) -> None:
    other_after_school = program_row(sync_db, "mid-math-support")
    academy_program = program_row(sync_db, "a-elem-math")
    elem_before, mid_before = timetable(sync_db, "school-elem"), timetable(sync_db, "school-mid")

    # (1) school 1 staff on school 2's after-school program: 404, unchanged.
    assert login(seeded, "school-elem").status_code == 200
    denied = seeded.put(
        f"/api/school/after-school/{seed_id('mid-math-support')}", json=AFTER_SCHOOL
    )
    assert denied.status_code == 404
    assert program_row(sync_db, "mid-math-support") == other_after_school

    # (2) parent on an academy program: 403, unchanged.
    assert login(seeded, "parent1").status_code == 200
    forbidden = seeded.put(f"/api/academy/programs/{seed_id('a-elem-math')}", json=PROGRAM)
    assert forbidden.status_code == 403
    assert forbidden.json() == {"detail": "forbidden"}
    assert program_row(sync_db, "a-elem-math") == academy_program

    # (3) school 1 staff saves its own timetable: only school 1 changes.
    assert login(seeded, "school-elem").status_code == 200
    saved = seeded.put(
        "/api/school/timetable",
        json={"entries": [{"grade": 5, "dow": "mon", "dismissal": "15:20"}]},
    )
    assert saved.status_code == 200
    assert saved.json()["school_id"] == str(seed_id("school-elem"))
    assert {"grade": 5, "dow": "mon", "dismissal": "15:20"} in saved.json()["entries"]
    elem_after = timetable(sync_db, "school-elem")
    changed = set(elem_after) - set(elem_before)
    assert changed == {(5, 0, 15 * 60 + 20)}
    assert len(elem_after) == len(elem_before)
    assert timetable(sync_db, "school-mid") == mid_before


def test_school_staff_updates_own_after_school_program(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    response = seeded.put(f"/api/school/after-school/{seed_id('elem-robot')}", json=AFTER_SCHOOL)
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "after_school"
    assert body["institution_id"] == str(seed_id("school-elem"))
    assert (body["lat"], body["lng"]) == (37.5, 127.03)  # the school's location
    assert program_row(sync_db, "elem-robot")["instructor"] == "시험 강사"


def test_timetable_read_is_own_school_only(seeded: TestClient) -> None:
    assert login(seeded, "school-mid").status_code == 200
    body = seeded.get("/api/school/timetable").json()
    assert body["school_id"] == str(seed_id("school-mid"))
    assert {e["grade"] for e in body["entries"]} == {7, 8, 9}


@pytest.mark.parametrize("field", ["subject", "instructor"])
def test_blank_text_on_owned_update_is_422_and_row_unchanged(sync_db, seeded, field) -> None:
    """PR #17 review: whitespace-only text used to pass the length check, be stripped to ''
    and committed before the response model failed (500)."""
    assert login(seeded, "academy-a").status_code == 200
    before = program_row(sync_db, "a-elem-math")
    response = seeded.put(
        f"/api/academy/programs/{seed_id('a-elem-math')}", json={**PROGRAM, field: "   "}
    )
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert program_row(sync_db, "a-elem-math") == before


def test_422_schema_allows_field_errors_and_business_codes() -> None:
    """AD-13: 422 is FastAPI field errors (detail list) or a business code (detail string)."""
    from app.main import app

    schema = app.openapi()["paths"]["/api/academy/programs/{program_id}"]["put"]["responses"]
    refs = {
        item["$ref"].rsplit("/", 1)[1]
        for item in schema["422"]["content"]["application/json"]["schema"]["anyOf"]
    }
    assert refs == {"ErrorBody", "FieldErrors"}
