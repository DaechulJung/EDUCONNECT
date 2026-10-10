"""PUT /api/children/{id}: the parent's own child only (AD-8), consent under 14 (SEC-07),
no real-name or contact fields. #6 needs it to save interests (AC-06.4); the screen is #4."""

from sqlalchemy import text

from tests.conftest import login
from tests.test_chat_api import make_child  # noqa: F401  (fixture)

BODY = {
    "alias": "하늘",
    "age": 11,
    "grade": 5,
    "interests": ["과학"],
    "goal": "수학 심화",
    "existing_events": [{"dow": "sat", "start": "10:00", "end": "12:00", "label": "수영"}],
    "consent_checked": True,
}


def stored(sync_db, child_id: str) -> dict:
    with sync_db.connect() as conn:
        row = conn.execute(
            text(
                "SELECT alias, age, interests, goal, existing_events FROM children WHERE id = :id"
            ),
            {"id": child_id},
        )
        return dict(row.mappings().one())


def test_updates_own_child(client, make_account, make_child, sync_db) -> None:  # noqa: F811
    login_id, parent_id, _ = make_account("parent")
    child_id = make_child(parent_id)
    assert login(client, login_id).status_code == 200

    response = client.put(f"/api/children/{child_id}", json=BODY)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == child_id and body["interests"] == ["과학"] and body["goal"] == "수학 심화"
    assert body["existing_events"] == BODY["existing_events"]
    assert not {"name", "real_name", "phone", "contact"} & set(body)
    assert stored(sync_db, child_id)["existing_events"] == [
        {"dow": 5, "start_min": 600, "end_min": 720, "label": "수영"}
    ]


def test_other_parents_child_404(client, make_account, make_child, sync_db) -> None:  # noqa: F811
    login_id, _, _ = make_account("parent")
    _, other_id, _ = make_account("parent")
    child_id = make_child(other_id)
    before = stored(sync_db, child_id)
    assert login(client, login_id).status_code == 200

    response = client.put(f"/api/children/{child_id}", json=BODY)

    assert response.status_code == 404
    assert "하늘" not in response.text
    assert stored(sync_db, child_id) == before


def test_consent_and_real_names(client, make_account, make_child, sync_db) -> None:  # noqa: F811
    login_id, parent_id, _ = make_account("parent")
    child_id = make_child(parent_id)
    before = stored(sync_db, child_id)
    assert login(client, login_id).status_code == 200

    no_consent = client.put(f"/api/children/{child_id}", json={**BODY, "consent_checked": False})
    assert no_consent.status_code == 422
    assert no_consent.json()["detail"] == "consent_required"
    assert (
        client.put(f"/api/children/{child_id}", json={**BODY, "name": "홍길동"}).status_code == 422
    )
    assert stored(sync_db, child_id) == before


def test_unknown_school_is_rejected(client, make_account, make_child) -> None:  # noqa: F811
    login_id, parent_id, _ = make_account("parent")
    child_id = make_child(parent_id)
    assert login(client, login_id).status_code == 200
    response = client.put(f"/api/children/{child_id}", json={**BODY, "school_id": parent_id})
    assert response.status_code == 422
    assert response.json()["detail"] == "invalid_school"
