"""POST /api/children (#4): the parent creates a child for themselves only, consent under 14
(SEC-07, AC-04.3) and no real-name or contact fields (SEC-07, AC-04.4)."""

from sqlalchemy import text

from tests.conftest import login

BODY = {
    "alias": "하늘",
    "age": 11,
    "grade": 5,
    "interests": ["과학"],
    "goal": "수학 심화",
    "existing_events": [{"dow": "sat", "start": "10:00", "end": "12:00", "label": "수영"}],
    "consent_checked": True,
}


def children_of(sync_db, parent_id: str) -> list[dict]:
    with sync_db.connect() as conn:
        rows = conn.execute(
            text("SELECT alias, age, grade, existing_events FROM children WHERE parent_id = :p"),
            {"p": parent_id},
        )
        return [dict(r) for r in rows.mappings()]


def test_creates_child_for_session_parent(client, make_account, sync_db) -> None:
    login_id, parent_id, _ = make_account("parent")
    assert login(client, login_id).status_code == 200

    response = client.post("/api/children", json=BODY)

    assert response.status_code == 201
    body = response.json()
    assert body["alias"] == "하늘" and body["grade"] == 5 and body["id"]
    assert body["existing_events"] == BODY["existing_events"]
    assert not {"name", "real_name", "phone", "contact"} & set(body)
    assert client.get(f"/api/children/{body['id']}").json()["alias"] == "하늘"
    assert [c["alias"] for c in client.get("/api/children").json()] == ["하늘"]
    assert children_of(sync_db, parent_id) == [
        {
            "alias": "하늘",
            "age": 11,
            "grade": 5,
            "existing_events": [{"dow": 5, "start_min": 600, "end_min": 720, "label": "수영"}],
        }
    ]


def test_under_14_without_consent_is_422(client, make_account, sync_db) -> None:
    login_id, parent_id, _ = make_account("parent")
    assert login(client, login_id).status_code == 200

    response = client.post("/api/children", json={**BODY, "age": 13, "consent_checked": False})

    assert response.status_code == 422
    assert response.json()["detail"] == "consent_required"
    assert children_of(sync_db, parent_id) == []
    over = client.post("/api/children", json={**BODY, "age": 14, "grade": 7, "consent_checked": False})
    assert over.status_code == 201


def test_real_name_or_contact_fields_rejected(client, make_account, sync_db) -> None:
    login_id, parent_id, _ = make_account("parent")
    assert login(client, login_id).status_code == 200

    for extra in ({"real_name": "김하늘"}, {"phone": "010-0000-0000"}):
        assert client.post("/api/children", json={**BODY, **extra}).status_code == 422
    assert children_of(sync_db, parent_id) == []


def test_invalid_school_is_422(client, make_account, sync_db) -> None:
    login_id, parent_id, _ = make_account("parent")
    assert login(client, login_id).status_code == 200

    bad = client.post("/api/children", json={**BODY, "school_id": "not-a-uuid"})

    assert bad.status_code == 422
    assert bad.json()["detail"] == "invalid_school"
    assert children_of(sync_db, parent_id) == []


def test_signed_out_is_401(client, make_account, sync_db) -> None:
    _, parent_id, _ = make_account("parent")
    client.cookies.clear()
    assert client.post("/api/children", json=BODY).status_code == 401
    assert children_of(sync_db, parent_id) == []
