"""REQ-01 audit trail (TC-76, AC-01.13): every security event leaves a row with time, kind,
account and target, and no secret value appears anywhere in the trail (AD-9, SEC-10).

No API reads audit_events (AD-9), so the test SELECTs the table.
"""

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.core.session import COOKIE_NAME
from app.main import create_app
from app.seed.load import seed_id
from tests.conftest import TEST_PASSWORD, login

FAKE_AZURE = {
    "AZURE_OPENAI_API_KEY": "fake-azure-key-tc76-0000",
    "AZURE_OPENAI_ENDPOINT": "https://fake-tc76.openai.azure.example",
}
KINDS = {
    "login_success",
    "login_failure",
    "account_locked",
    "logout",
    "access_denied_404",
    "access_denied_403",
}
PROGRAM = {
    "subject": "수학", "type": "academy", "days": ["mon"], "start": "16:00", "end": "17:00",
    "monthly_tuition": 1, "monthly_other": 0, "instructor": "강사", "grade_min": 4,
    "grade_max": 6, "capacity": 10, "enrolled": 3, "lat": 37.5, "lng": 127.0,
}  # fmt: skip


def test_tc76_audit_rows_without_secrets(monkeypatch, sync_db) -> None:
    # The fake Azure values go in before the app is built, so the app (and its log masking)
    # really holds them; injecting after create_app would check values the app never saw.
    for name, value in FAKE_AZURE.items():
        monkeypatch.setenv(name, value)
    config = Settings(enable_test_routes=True)
    assert config.azure_openai_api_key == FAKE_AZURE["AZURE_OPENAI_API_KEY"]
    assert config.azure_openai_endpoint == FAKE_AZURE["AZURE_OPENAI_ENDPOINT"]
    with TestClient(create_app(config)) as seeded:
        _run_tc76(sync_db, seeded)


def _run_tc76(sync_db, seeded: TestClient) -> None:
    assert seeded.post("/api/test/reset").json() == {"reset": True}
    with sync_db.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM audit_events")) == 0

    cookies = []
    assert login(seeded, "parent1").status_code == 200  # login_success
    cookies.append(seeded.cookies[COOKIE_NAME])
    assert login(seeded, "parent1", "wrong").status_code == 401  # login_failure
    for _ in range(5):
        login(seeded, "parent2", "wrong")
    assert login(seeded, "parent2").json() == {"detail": "account_locked"}  # account_locked
    assert login(seeded, "parent1").status_code == 200
    cookies.append(seeded.cookies[COOKIE_NAME])
    assert seeded.get(f"/api/children/{seed_id('child-mid1')}").status_code == 404
    response = seeded.put(f"/api/academy/programs/{seed_id('a-elem-math')}", json=PROGRAM)
    assert response.status_code == 403
    assert seeded.post("/api/auth/logout").status_code == 204  # logout

    with sync_db.connect() as conn:
        rows = [dict(r._mapping) for r in conn.execute(text("SELECT * FROM audit_events"))]
    assert {r["kind"] for r in rows} >= KINDS
    for row in rows:  # every event here names a seed account
        assert row["at"] and row["kind"] and row["account_id"] and row["target"], row

    trail = " ".join(str(value) for row in rows for value in row.values())
    for secret in [TEST_PASSWORD, *cookies, *FAKE_AZURE.values()]:
        assert secret not in trail
