"""REQ-05 routes: chat turn, conditions save and load, the child-ownership 404 (AD-8).

Children are inserted directly until the seed (#11) and family (#4) exist.
"""

import uuid

import pytest
from sqlalchemy import text

from app.ai import fake
from app.core.config import settings
from app.services.chat.extract import TASK
from tests.conftest import login

AROUND = "초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게"
SAVED = {
    "subjects": ["영어", "수학"],
    "budget_target": 1_000_000,
    "budget_cap": 1_000_000,
    "types": ["academy"],
    "days": ["mon", "wed", "fri"],
    "density": "tight",
}


@pytest.fixture
def make_child(sync_db):
    created: list[str] = []

    def make(parent_id: str) -> str:
        child_id = str(uuid.uuid4())
        with sync_db.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO children (id, parent_id, alias, age, grade)"
                    " VALUES (:id, :parent, '하늘', 11, 5)"
                ),
                {"id": child_id, "parent": parent_id},
            )
        created.append(child_id)
        return child_id

    yield make
    with sync_db.begin() as conn:
        for child_id in created:
            conn.execute(text("DELETE FROM children WHERE id = :id"), {"id": child_id})


@pytest.fixture
def parent_child(client, make_account, make_child):
    login_id, account_id, _ = make_account("parent")
    child_id = make_child(account_id)
    assert login(client, login_id).status_code == 200
    return child_id


@pytest.fixture
def llm(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "fake")
    fake.provider.reset()
    yield fake.provider
    fake.provider.reset()


def test_no_conditions_yet_is_null(client, parent_child) -> None:
    response = client.get(f"/api/children/{parent_child}/conditions")
    assert response.status_code == 200
    assert response.json() is None


def test_saved_conditions_survive_a_new_chat(client, parent_child, llm) -> None:  # AC-05.3
    saved = client.put(f"/api/children/{parent_child}/conditions", json=SAVED)
    assert saved.status_code == 200
    assert saved.json() == {**SAVED, "child_id": parent_child}
    assert client.get(f"/api/children/{parent_child}/conditions").json() == saved.json()

    llm.configure(TASK, "error")
    reply = client.post("/api/chat/messages", json={"child_id": parent_child, "text": "안녕하세요"})
    assert reply.status_code == 200
    assert reply.json()["conditions"]["budget_cap"] == 1_000_000  # nothing said, saved value


def test_save_overwrites_one_row_per_child(client, parent_child) -> None:
    client.put(f"/api/children/{parent_child}/conditions", json=SAVED)
    changed = {**SAVED, "budget_cap": 1_100_000, "days": ["fri", "mon"]}
    response = client.put(f"/api/children/{parent_child}/conditions", json=changed)
    assert response.json()["budget_cap"] == 1_100_000
    assert response.json()["days"] == ["mon", "fri"]


def test_cap_below_target_is_rejected(client, parent_child) -> None:
    body = {**SAVED, "budget_target": 1_000_000, "budget_cap": 900_000}
    assert client.put(f"/api/children/{parent_child}/conditions", json=body).status_code == 422
    blank = {**SAVED, "subjects": ["  "]}
    assert client.put(f"/api/children/{parent_child}/conditions", json=blank).status_code == 422


def test_chat_turn_with_the_llm_double(client, parent_child, llm) -> None:  # AC-05.1 (API part)
    llm.configure(
        TASK,
        "fixed",
        {
            "subjects": ["영어", "수학"],
            "budget_amount": 1_000_000,
            "budget_mode": "around",
            "types": [],
            "days": [],
            "density": "tight",
        },
    )
    response = client.post("/api/chat/messages", json={"child_id": parent_child, "text": AROUND})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "llm"
    assert body["conditions"] == {
        "child_id": parent_child,
        "subjects": ["영어", "수학"],
        "budget_target": 1_000_000,
        "budget_cap": 1_100_000,
        "types": [],
        "days": [],
        "density": "tight",
    }
    # the draft is not saved until the parent presses '조건 저장'
    assert client.get(f"/api/children/{parent_child}/conditions").json() is None


def test_bad_llm_json_uses_rules_without_leaking_the_error(client, parent_child, llm) -> None:
    llm.configure(TASK, "bad_json")  # AC-05.6 (API part)
    response = client.post("/api/chat/messages", json={"child_id": parent_child, "text": AROUND})
    body = response.json()
    assert body["source"] == "fallback"
    assert body["conditions"]["budget_cap"] == 1_100_000
    assert body["conditions"]["subjects"] == ["영어", "수학"]
    assert "not" not in body["reply"] and "schema" not in response.text


@pytest.mark.parametrize("target", ["other", "missing", "not-a-uuid"])
def test_someone_elses_child_is_404_and_audited(
    target, client, make_account, make_child, sync_db
) -> None:
    _, other_parent, _ = make_account("parent")
    child_id = {
        "other": make_child(other_parent),
        "missing": str(uuid.uuid4()),
        "not-a-uuid": "c1",
    }[target]
    login_id, me, _ = make_account("parent")
    login(client, login_id)
    for method, url, body in [
        ("GET", f"/api/children/{child_id}/conditions", None),
        ("PUT", f"/api/children/{child_id}/conditions", SAVED),
        ("POST", "/api/chat/messages", {"child_id": child_id, "text": AROUND}),
    ]:
        response = client.request(method, url, json=body)
        assert response.status_code == 404, (method, url)
        assert response.json() == {"detail": "not_found"}
    with sync_db.connect() as conn:
        denied = conn.execute(
            text(
                "SELECT count(*) FROM audit_events"
                " WHERE account_id = :me AND kind = 'access_denied_404'"
            ),
            {"me": me},
        ).scalar()
    assert denied == 3
    if target == "other":
        with sync_db.connect() as conn:
            rows = conn.execute(
                text("SELECT count(*) FROM child_conditions WHERE child_id = :id"),
                {"id": child_id},
            ).scalar()
        assert rows == 0


def test_staff_cannot_use_the_chat(client, make_account) -> None:
    login_id, _, _ = make_account("academy")
    login(client, login_id)
    response = client.post("/api/chat/messages", json={"child_id": "c1", "text": AROUND})
    assert response.status_code == 403


def test_budget_beyond_the_integer_column_is_422(client, parent_child) -> None:
    for field in ("budget_target", "budget_cap"):
        body = {**SAVED, "budget_target": 0, field: 2_147_483_648}
        response = client.put(f"/api/children/{parent_child}/conditions", json=body)
        assert response.status_code == 422, response.text
    assert client.get(f"/api/children/{parent_child}/conditions").json() is None


def test_chat_budget_beyond_the_integer_column_is_not_used(client, parent_child, llm) -> None:
    llm.configure(TASK, "error")  # rule extraction
    reply = client.post(
        "/api/chat/messages", json={"child_id": parent_child, "text": "영어 월 30억원 전후로"}
    )
    assert reply.status_code == 200, reply.text
    conditions = reply.json()["conditions"]
    assert conditions["budget_target"] <= 2_147_483_647
    assert conditions["budget_cap"] <= 2_147_483_647
