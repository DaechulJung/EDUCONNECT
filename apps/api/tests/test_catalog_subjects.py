"""GET /api/catalog/subjects (AD-15): subjects of live programs for the condition sheet chips.

It answered 501 after #5 closed, so the sheet fell back to BASE_SUBJECTS and an academy's new
subject never showed (preview 12:05Z). Every test starts from POST /api/test/reset.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import login

ROBOT = {
    "subject": "로봇", "type": "academy", "days": ["tue"], "start": "16:00", "end": "17:00",
    "monthly_tuition": 200000, "monthly_other": 0, "instructor": "시험 강사", "grade_min": 4,
    "grade_max": 6, "capacity": 10, "enrolled": 0, "lat": 37.5, "lng": 127.03,
}  # fmt: skip


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def live_subjects(sync_db) -> list[str]:
    with sync_db.connect() as conn:
        rows = conn.execute(text("SELECT subject FROM programs WHERE deleted_at IS NULL"))
        return sorted({r for (r,) in rows})


def test_signed_out_is_401(seeded: TestClient) -> None:
    seeded.cookies.clear()
    assert seeded.get("/api/catalog/subjects").status_code == 401


@pytest.mark.parametrize("login_id", ["parent1", "academy-a", "school-elem"])
def test_every_role_gets_200(seeded: TestClient, login_id: str) -> None:
    assert login(seeded, login_id).status_code == 200
    response = seeded.get("/api/catalog/subjects")
    assert response.status_code == 200
    assert response.json()  # the seed has programs, so an empty list would hide a broken query


def test_unique_sorted_and_deleted_only_subject_left_out(seeded: TestClient, sync_db) -> None:
    assert login(seeded, "academy-a").status_code == 200
    assert seeded.post("/api/academy/programs", json=ROBOT).status_code == 201
    drone = seeded.post("/api/academy/programs", json={**ROBOT, "subject": "드론"}).json()
    assert seeded.delete(f"/api/academy/programs/{drone['id']}").status_code == 204

    body = seeded.get("/api/catalog/subjects").json()

    assert body == live_subjects(sync_db)  # one entry per subject, Python sorted order
    assert len(body) == len(set(body))
    assert "로봇" in body
    assert "드론" not in body  # only on a deleted program; after-school subjects count too
    with sync_db.connect() as conn:
        after_school = conn.execute(
            text("SELECT DISTINCT subject FROM programs WHERE type = 'after_school'")
        ).scalars()
        assert set(after_school) <= set(body)
