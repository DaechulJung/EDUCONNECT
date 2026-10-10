"""BASE-01.5: require_role 401/403, deny_not_found 404 with one audit row, and core/units,
core/vocab, core/clock as AD-6, AD-15, AD-11 say."""

from datetime import timedelta

import pytest
from fastapi import APIRouter
from sqlalchemy import text

from app.core import clock, units, vocab
from app.core.authz import Parent, deny_not_found
from tests.conftest import login

probe = APIRouter()


@probe.get("/api/probe/{thing_id}")
async def probe_thing(thing_id: str, session: Parent) -> dict:
    await deny_not_found(session, f"/api/probe/{thing_id}")


@pytest.fixture(scope="module")
def probe_client(client):
    client.app.include_router(probe)
    return client


def _audit(sync_db, account_id: str) -> list[tuple[str, str]]:
    with sync_db.connect() as conn:
        rows = conn.execute(
            text("SELECT kind, target FROM audit_events WHERE account_id = :a ORDER BY at"),
            {"a": account_id},
        )
        return [tuple(row) for row in rows]


def test_require_role_without_session_is_401(probe_client) -> None:
    probe_client.cookies.clear()
    response = probe_client.get("/api/probe/1")
    assert response.status_code == 401
    assert response.json() == {"detail": "unauthenticated"}


def test_require_role_wrong_role_is_403_and_audited(probe_client, make_account, sync_db) -> None:
    login_id, account_id, _ = make_account("school")
    login(probe_client, login_id)
    response = probe_client.get("/api/probe/1")
    assert response.status_code == 403
    assert response.json() == {"detail": "forbidden"}
    assert ("access_denied_403", "/api/probe/1") in _audit(sync_db, account_id)


def test_deny_not_found_is_404_with_one_audit_row(probe_client, make_account, sync_db) -> None:
    login_id, account_id, _ = make_account("parent")
    login(probe_client, login_id)
    response = probe_client.get("/api/probe/abc")
    assert response.status_code == 404
    assert response.json() == {"detail": "not_found"}
    denied = [row for row in _audit(sync_db, account_id) if row[0] == "access_denied_404"]
    assert denied == [("access_denied_404", "/api/probe/abc")]


def test_login_events_are_audited_without_secrets(client, make_account, sync_db) -> None:
    login_id, account_id, _ = make_account("parent")
    login(client, login_id, "wrong-password")
    login(client, login_id)
    token = client.cookies.get("ec_session")
    client.post("/api/auth/logout")
    kinds = [kind for kind, _ in _audit(sync_db, account_id)]
    assert kinds == ["login_failure", "login_success", "logout"]
    with sync_db.connect() as conn:
        dump = " ".join(str(r) for r in conn.execute(text("SELECT * FROM audit_events")))
    assert token not in dump
    assert "wrong-password" not in dump


def test_units_convert_both_ways() -> None:
    assert units.hhmm_to_min("13:40") == 820
    assert units.min_to_hhmm(820) == "13:40"
    assert units.dows_to_ints(["wed", "mon", "wed"]) == [0, 2]
    assert units.ints_to_dows([4, 1]) == ["tue", "fri"]
    assert units.grade_label(5) == "초5" and units.grade_label(7) == "중1"
    assert units.dismissal_to_db({"wed": "13:40"}) == {"2": 820}
    assert units.dismissal_to_api({"2": 820}) == {"wed": "13:40"}
    for bad in ("24:00", "9:00", "12:60"):
        with pytest.raises(ValueError):
            units.hhmm_to_min(bad)
    with pytest.raises(ValueError):
        units.grade_label(10)


def test_vocab_codes_and_labels() -> None:
    assert vocab.PROGRAM_TYPE_LABELS == {
        "academy": "교과 학원",
        "arts": "예체능 학원",
        "other": "기타",
        "after_school": "방과후",
    }
    assert vocab.DOW_CODES == ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    assert vocab.DOW_LABELS["wed"] == "수"
    assert vocab.normalize_subject("  수학 ") == "수학"


def test_clock_moves_only_by_advance_and_resets() -> None:
    start = clock.now()
    moved = clock.advance(15)
    assert moved - start >= timedelta(minutes=15)
    clock.reset()
    assert clock.now() - start < timedelta(minutes=1)
