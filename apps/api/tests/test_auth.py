"""REQ-01 login hardening on the seed (TC-06~09, TC-11, TC-12).

Every test starts from POST /api/test/reset, so seed accounts and the clock start the same.
"""

import json
from http.cookies import SimpleCookie

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.session import COOKIE_NAME
from app.seed.load import seed_id
from tests.conftest import TEST_PASSWORD, login

PROGRAM = {
    "subject": "수학", "type": "academy", "days": ["mon"], "start": "16:00", "end": "17:00",
    "monthly_tuition": 1, "monthly_other": 0, "instructor": "강사", "grade_min": 4,
    "grade_max": 6, "capacity": 10, "enrolled": 3, "lat": 37.5, "lng": 127.0,
}  # fmt: skip


@pytest.fixture(autouse=True)
def _reset(seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}


def snapshot(sync_db) -> list:
    """DB values the unauthenticated calls in TC-12 could touch."""
    with sync_db.connect() as conn:
        return [
            conn.execute(text(f"SELECT * FROM {table} ORDER BY id")).all()
            for table in ("children", "programs", "school_timetables")
        ]


def test_tc06_seed_password_is_stored_as_scrypt(sync_db) -> None:
    with sync_db.connect() as conn:
        stored = conn.execute(text("SELECT password_hash FROM accounts")).scalars().all()
    assert len(stored) == 9
    for value in stored:
        assert value != TEST_PASSWORD and TEST_PASSWORD not in value
        assert value.startswith("scrypt$") and len(value.split("$")) == 6


def test_tc07_five_failures_lock_the_account(seeded: TestClient) -> None:
    for _ in range(5):
        assert login(seeded, "parent1", "wrong").json() == {"detail": "invalid_credentials"}
    locked = login(seeded, "parent1")
    assert locked.status_code == 401
    assert locked.json() == {"detail": "account_locked"}
    assert COOKIE_NAME not in locked.cookies
    assert seeded.get("/api/auth/me").status_code == 401


def test_tc08_lock_ends_after_fifteen_minutes(seeded: TestClient) -> None:
    for _ in range(5):
        login(seeded, "parent1", "wrong")
    assert login(seeded, "parent1").json() == {"detail": "account_locked"}
    seeded.post("/api/test/clock", json={"advance_minutes": 14})
    assert login(seeded, "parent1").json() == {"detail": "account_locked"}
    seeded.post("/api/test/clock", json={"advance_minutes": 1})
    response = login(seeded, "parent1")
    assert response.status_code == 200
    assert COOKIE_NAME in response.cookies


def test_tc09_old_cookie_is_401_after_logout(seeded: TestClient) -> None:
    child = seed_id("child-elem5")
    assert login(seeded, "parent1").status_code == 200
    cookie = seeded.cookies[COOKIE_NAME]
    assert seeded.get(f"/api/children/{child}").status_code == 200
    assert seeded.post("/api/auth/logout").status_code == 204
    seeded.cookies.clear()
    seeded.cookies.set(COOKIE_NAME, cookie)
    assert seeded.get(f"/api/children/{child}").status_code == 401


def test_tc11_session_cookie_attributes(seeded: TestClient) -> None:
    response = login(seeded, "parent1")
    header = next(
        v for k, v in response.headers.multi_items() if k == "set-cookie" and COOKIE_NAME in v
    )
    morsel = SimpleCookie(header)[COOKIE_NAME]
    assert morsel["httponly"] is True
    assert morsel["samesite"].lower() in ("lax", "strict")
    assert morsel["max-age"] or morsel["expires"]


def test_tc12_no_cookie_is_401_and_changes_nothing(sync_db, seeded: TestClient) -> None:
    seeded.cookies.clear()
    before = snapshot(sync_db)
    child, program = seed_id("child-elem5"), seed_id("a-elem-math")
    new_child = {"alias": "별", "age": 11, "grade": 5, "consent_checked": True}
    entries = {"entries": [{"grade": 5, "dow": "mon", "dismissal": "15:50"}]}
    calls = [
        ("GET", f"/api/children/{child}", None),
        ("POST", "/api/children", new_child),
        ("PUT", f"/api/academy/programs/{program}", PROGRAM),
        ("PUT", "/api/school/timetable", entries),
    ]
    for method, url, body in calls:
        response = seeded.request(method, url, json=body)
        assert response.status_code == 401, url
        assert response.json() == {"detail": "unauthenticated"}
        for value in ("하늘", "바다", "parent1", str(child)):
            assert value not in json.dumps(response.json(), ensure_ascii=False)
    assert snapshot(sync_db) == before
