"""AC-04.5 server side (TC-27 is the screen E2E): no school timetable for the child's grade.

Draft creation answers 422 `school_timetable_missing` instead of placing classes over school hours.
After the parent saves 요일별 하교 시각 (`manual_dismissal`) the draft is built and every class
starts at or after that day's time. The grade's rows are left out with the seed reset option
`omit_timetable` (test route only; the product API has no timetable delete).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.seed import load
from tests.conftest import login

CHILD = str(load.seed_id("child-elem5"))
CONDITIONS = {
    "subjects": ["영어", "수학"],
    "budget_target": 1_000_000,
    "budget_cap": 1_100_000,
    "types": [],
    "days": [],
    "density": "tight",
}
MANUAL = {"mon": "15:00", "tue": "14:50", "wed": "14:00", "thu": "15:00", "fri": "14:30"}


OMIT_ELEM5 = {"omit_timetable": [{"school": "school-elem", "grade": 5}]}


def _timetable_rows(sync_db, grade: int | None = None) -> int:
    sql = "SELECT count(*) FROM school_timetables"
    with sync_db.connect() as conn:
        if grade is None:
            return conn.execute(text(sql)).scalar_one()
        return conn.execute(
            text(sql + " WHERE school_id = :school AND grade = :grade"),
            {"school": str(load.seed_id("school-elem")), "grade": grade},
        ).scalar_one()


def _plan_rows(sync_db) -> int:
    with sync_db.connect() as conn:
        return conn.execute(text("SELECT count(*) FROM plans")).scalar_one()


@pytest.mark.parametrize("body", [None, {}, {"omit_timetable": []}])
def test_reset_without_omit_loads_every_timetable_row(seeded: TestClient, sync_db, body) -> None:
    assert seeded.post("/api/test/reset", json=body).json() == {"reset": True}
    assert _timetable_rows(sync_db) == 45


def test_reset_omit_leaves_out_only_that_grade(seeded: TestClient, sync_db) -> None:
    assert seeded.post("/api/test/reset", json=OMIT_ELEM5).json() == {"reset": True}
    assert _timetable_rows(sync_db, 5) == 0
    assert _timetable_rows(sync_db, 6) == 5
    assert _timetable_rows(sync_db) == 40
    assert seeded.post("/api/test/reset").json() == {"reset": True}
    assert _timetable_rows(sync_db) == 45


def test_reset_omit_rejects_unknown_school(seeded: TestClient) -> None:
    bad = {"omit_timetable": [{"school": "no-such-school", "grade": 5}]}
    assert seeded.post("/api/test/reset", json=bad).status_code == 422


@pytest.fixture
def no_timetable(seeded: TestClient, monkeypatch):
    assert seeded.post("/api/test/reset", json=OMIT_ELEM5).json() == {"reset": True}
    monkeypatch.setattr(settings, "llm_provider", "fake")
    assert login(seeded, "parent1").status_code == 200
    assert seeded.put(f"/api/children/{CHILD}/conditions", json=CONDITIONS).status_code == 200
    yield seeded
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def test_draft_without_timetable_or_manual_time_is_422(no_timetable: TestClient, sync_db) -> None:
    assert not no_timetable.get(f"/api/children/{CHILD}").json()["manual_dismissal"]
    response = no_timetable.post("/api/plans/draft", json={"child_id": CHILD})
    assert response.status_code == 422, response.text
    assert response.json()["detail"] == "school_timetable_missing"
    assert _plan_rows(sync_db) == 0


def test_manual_dismissal_places_classes_after_it(no_timetable: TestClient) -> None:
    child = no_timetable.get(f"/api/children/{CHILD}").json()
    child.pop("id")
    child["manual_dismissal"] = MANUAL
    saved = no_timetable.put(f"/api/children/{CHILD}", json=child)
    assert saved.status_code == 200, saved.text

    response = no_timetable.post("/api/plans/draft", json={"child_id": CHILD})
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    weekday = [item for item in items if set(item["days"]) & set(MANUAL)]
    assert weekday, "평일 수업이 1개 이상"
    for item in items:
        for day in item["days"]:
            if day in MANUAL:  # weekdays; 토·일 have no school hours
                label = f"{item['institution_name']} {item['subject']} {day} {item['start']}"
                assert item["start"] >= MANUAL[day], label
