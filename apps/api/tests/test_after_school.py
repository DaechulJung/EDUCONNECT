"""REQ-03 after-school programs on the seed: list, create, delete (#3) and the API side of TC-22.

Every test starts from POST /api/test/reset. The recommendation check of AC-03.3 comes with #6.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.seed.load import seed_id
from tests.conftest import login

# AC-03.3's robot program. The seed robot class runs Fri 15:00~16:20, so 14:00~15:00 only touches it.
ROBOT = {
    "subject": "로봇", "days": ["fri"], "start": "14:00", "end": "15:00",
    "monthly_tuition": 30000, "monthly_other": 0, "instructor": "시험 강사",
    "grade_min": 3, "grade_max": 6, "capacity": 15, "enrolled": 5,
}  # fmt: skip
OVERLAP = {**ROBOT, "subject": "코딩", "start": "14:30", "end": "15:30"}


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def program_count(sync_db) -> int:
    with sync_db.connect() as conn:
        return conn.execute(text("SELECT count(*) FROM programs")).scalar_one()


def test_list_shows_own_school_programs_only(seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    response = seeded.get("/api/school/after-school")
    assert response.status_code == 200
    assert {p["id"] for p in response.json()} == {
        str(seed_id(k)) for k in ("elem-english-talk", "elem-robot")
    }
    assert {p["type"] for p in response.json()} == {"after_school"}


def test_create_uses_the_school_location(seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    created = seeded.post("/api/school/after-school", json=ROBOT)
    assert created.status_code == 201
    body = created.json()
    assert {k: body[k] for k in ROBOT} == ROBOT
    assert body["type"] == "after_school"
    assert body["institution_id"] == str(seed_id("school-elem"))
    assert (body["lat"], body["lng"]) == (37.5, 127.03)
    assert body["id"] in {p["id"] for p in seeded.get("/api/school/after-school").json()}


def test_tc22_overlap_on_same_grade_and_day_is_422_time_overlap(sync_db, seeded) -> None:
    assert login(seeded, "school-elem").status_code == 200
    assert seeded.post("/api/school/after-school", json=ROBOT).status_code == 201
    before = program_count(sync_db)
    response = seeded.post("/api/school/after-school", json=OVERLAP)
    assert response.status_code == 422
    assert response.json()["detail"] == "time_overlap"
    assert program_count(sync_db) == before


@pytest.mark.parametrize(
    "change",
    [
        {"grade_min": 1, "grade_max": 2},  # other grades
        {"days": ["thu"]},  # other day
        {"start": "15:00", "end": "16:00"},  # starts when the 14:00~15:00 class ends
    ],
)
def test_no_overlap_when_grade_day_or_time_differs(change: dict, seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    assert seeded.post("/api/school/after-school", json=ROBOT).status_code == 201
    # The seed robot class (Fri 15:00~16:20) is moved off Friday so only ROBOT can collide.
    robot = str(seed_id("elem-robot"))
    seed_robot = next(p for p in seeded.get("/api/school/after-school").json() if p["id"] == robot)
    moved = {k: seed_robot[k] for k in ROBOT} | {"days": ["mon"]}
    assert seeded.put(f"/api/school/after-school/{robot}", json=moved).status_code == 200
    assert seeded.post("/api/school/after-school", json={**OVERLAP, **change}).status_code == 201


def test_other_schools_programs_do_not_count_as_overlap(seeded: TestClient) -> None:
    assert login(seeded, "school-mid").status_code == 200
    # The middle school's own Wed 14:50~15:40 class overlaps; the elementary Wed class does not count.
    clash = {**ROBOT, "days": ["wed"], "start": "15:00", "end": "16:00", "grade_min": 7}
    clash["grade_max"] = 9
    assert seeded.post("/api/school/after-school", json=clash).json()["detail"] == "time_overlap"
    # Same grades, day and time as the elementary Wed 14:00~14:40 class: another school, so allowed.
    free = {**ROBOT, "days": ["wed"], "start": "14:00", "end": "14:40"}
    assert seeded.post("/api/school/after-school", json=free).status_code == 201


def test_update_overlap_is_422_and_ignores_itself(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    robot = str(seed_id("elem-robot"))
    current = next(p for p in seeded.get("/api/school/after-school").json() if p["id"] == robot)
    same = {k: current[k] for k in ROBOT}
    assert seeded.put(f"/api/school/after-school/{robot}", json=same).status_code == 200
    assert seeded.post("/api/school/after-school", json=ROBOT).status_code == 201
    response = seeded.put(
        f"/api/school/after-school/{robot}", json={**same, "start": "14:30", "end": "15:30"}
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "time_overlap"
    after = next(p for p in seeded.get("/api/school/after-school").json() if p["id"] == robot)
    assert (after["start"], after["end"]) == (current["start"], current["end"])


def test_delete_hides_the_program_and_keeps_the_row(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    target = str(seed_id("elem-english-talk"))
    assert seeded.delete(f"/api/school/after-school/{target}").status_code == 204
    assert target not in {p["id"] for p in seeded.get("/api/school/after-school").json()}
    with sync_db.connect() as conn:
        deleted_at = conn.execute(
            text("SELECT deleted_at FROM programs WHERE id = :id"), {"id": target}
        ).scalar_one()
    assert deleted_at is not None


def test_other_schools_program_cannot_be_deleted(sync_db, seeded: TestClient) -> None:
    assert login(seeded, "school-elem").status_code == 200
    other = str(seed_id("mid-math-support"))
    assert seeded.delete(f"/api/school/after-school/{other}").status_code == 404
    with sync_db.connect() as conn:
        deleted_at = conn.execute(
            text("SELECT deleted_at FROM programs WHERE id = :id"), {"id": other}
        ).scalar_one()
    assert deleted_at is None


def test_academy_staff_cannot_use_school_routes(seeded: TestClient) -> None:
    assert login(seeded, "academy-a").status_code == 200
    assert seeded.get("/api/school/after-school").status_code == 403
    assert seeded.post("/api/school/after-school", json=ROBOT).status_code == 403
