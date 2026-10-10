"""REQ-02 academy programs on the seed: list, create, delete (#2) and the API side of TC-15.

Every test starts from POST /api/test/reset. Recommendation checks (AC-02.4~02.6) come with #6.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.seed.load import seed_id
from tests.conftest import login

CODING = {
    "subject": "코딩", "type": "academy", "days": ["tue", "thu"], "start": "16:00",
    "end": "17:00", "monthly_tuition": 200000, "monthly_other": 20000, "instructor": "시험 강사",
    "grade_min": 4, "grade_max": 6, "capacity": 10, "enrolled": 3, "lat": 37.5, "lng": 127.03,
}  # fmt: skip

# AC-02.2's four invalid values, one per body (TC-15).
INVALID = {
    "end_before_start": {**CODING, "start": "17:00", "end": "16:00"},
    "negative_tuition": {**CODING, "monthly_tuition": -1},
    "zero_capacity": {**CODING, "capacity": 0, "enrolled": 0},
    "missing_location": {k: v for k, v in CODING.items() if k not in ("lat", "lng")},
}


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def program_count(sync_db) -> int:
    with sync_db.connect() as conn:
        return conn.execute(text("SELECT count(*) FROM programs")).scalar_one()


def test_list_shows_own_live_programs_only(seeded: TestClient) -> None:
    assert login(seeded, "academy-b").status_code == 200
    response = seeded.get("/api/academy/programs")
    assert response.status_code == 200
    ids = {p["id"] for p in response.json()}
    assert ids == {
        str(seed_id(k)) for k in ("b-elem-math", "b-elem-math-undisclosed", "b-mid-math")
    }
    undisclosed = next(
        p for p in response.json() if p["id"] == str(seed_id("b-elem-math-undisclosed"))
    )
    assert undisclosed["monthly_tuition"] is None


def test_create_keeps_tuition_and_other_apart(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "academy-a").status_code == 200
    created = seeded.post("/api/academy/programs", json=CODING)
    assert created.status_code == 201
    body = created.json()
    assert body["institution_id"] == str(seed_id("academy-a"))
    assert {k: body[k] for k in CODING} == CODING
    listed = {p["id"]: p for p in seeded.get("/api/academy/programs").json()}
    assert listed[body["id"]]["monthly_tuition"] == 200000
    assert listed[body["id"]]["monthly_other"] == 20000


@pytest.mark.parametrize("case", INVALID)
def test_tc15_invalid_values_are_422_and_add_no_row(case: str, sync_db, seeded) -> None:
    assert login(seeded, "academy-a").status_code == 200
    before = program_count(sync_db)
    response = seeded.post("/api/academy/programs", json=INVALID[case])
    assert response.status_code == 422, case
    assert isinstance(response.json()["detail"], list)
    assert program_count(sync_db) == before


def test_delete_hides_the_program_and_keeps_the_row(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "academy-e").status_code == 200
    target = str(seed_id("e-essay"))
    assert seeded.delete(f"/api/academy/programs/{target}").status_code == 204
    assert target not in {p["id"] for p in seeded.get("/api/academy/programs").json()}
    with sync_db.connect() as conn:
        deleted_at = conn.execute(
            text("SELECT deleted_at FROM programs WHERE id = :id"), {"id": target}
        ).scalar_one()
    assert deleted_at is not None  # soft delete: confirmed plans still see it (AD-4)
    assert seeded.delete(f"/api/academy/programs/{target}").status_code == 404
    assert seeded.put(f"/api/academy/programs/{target}", json=CODING).status_code == 404


def test_delete_someone_elses_program_is_404_and_changes_nothing(
    sync_db, seeded: TestClient
) -> None:
    assert login(seeded, "academy-a").status_code == 200
    before = program_count(sync_db)
    for program_id in (seed_id("b-elem-math"), seed_id("elem-robot"), "not-a-uuid"):
        response = seeded.delete(f"/api/academy/programs/{program_id}")
        assert response.status_code == 404, program_id
    assert login(seeded, "academy-b").status_code == 200
    assert str(seed_id("b-elem-math")) in {
        p["id"] for p in seeded.get("/api/academy/programs").json()
    }
    assert program_count(sync_db) == before


def test_parent_gets_403_on_every_program_route(seeded: TestClient) -> None:
    assert login(seeded, "parent1").status_code == 200
    target = seed_id("a-elem-math")
    for method, url, body in (
        ("GET", "/api/academy/programs", None),
        ("POST", "/api/academy/programs", CODING),
        ("DELETE", f"/api/academy/programs/{target}", None),
    ):
        assert seeded.request(method, url, json=body).status_code == 403, (method, url)
