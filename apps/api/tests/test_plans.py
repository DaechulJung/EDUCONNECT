"""REQ-08 plan edit·confirm·list API (AC-08.1~08.3 server side; TC-47~49 are the screen E2E).

Every test starts from POST /api/test/reset, signs in as the seed parent of 하늘(초5), saves the
기준 시나리오 conditions and creates a draft. Totals and program ids are read from responses.
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.seed import load
from tests.conftest import login

CHILD = str(load.seed_id("child-elem5"))
PARENT2 = str(load.seed_id("parent-2"))
BASE = {  # 기준 시나리오: 초5, 영어·수학, 목표 1,000,000·상한 1,100,000, 촘촘하게
    "subjects": ["영어", "수학"],
    "budget_target": 1_000_000,
    "budget_cap": 1_100_000,
    "types": [],
    "days": [],
    "density": "tight",
}


@pytest.fixture
def parent(seeded: TestClient, monkeypatch) -> TestClient:
    assert seeded.post("/api/test/reset").json() == {"reset": True}
    monkeypatch.setattr(settings, "llm_provider", "fake")
    assert login(seeded, "parent1").status_code == 200
    assert seeded.put(f"/api/children/{CHILD}/conditions", json=BASE).status_code == 200
    return seeded


@pytest.fixture
def school_overlap(sync_db, parent) -> str:
    """학원 A 영어(초4~6): 월·목 14:00~15:00, 초5 하교 14:40과 겹친다. 시드에는 이런 후보가 없다."""
    program_id = str(uuid.uuid4())
    with sync_db.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO programs (id, institution_id, type, subject, days, start_min,"
                " end_min, monthly_tuition, monthly_other, instructor, grade_min, grade_max,"
                " capacity, enrolled)"
                " VALUES (:id, :inst, 'academy', '영어', ARRAY[0, 3], 840, 900, 300000, 10000,"
                " '시험', 4, 6, 10, 0)"
            ),
            {"id": program_id, "inst": str(load.seed_id("academy-a"))},
        )
    yield program_id
    with sync_db.begin() as conn:
        conn.execute(text("DELETE FROM programs WHERE id = :id"), {"id": program_id})


def draft(client: TestClient) -> dict:
    response = client.post("/api/plans/draft", json={"child_id": CHILD})
    assert response.status_code == 200, response.text
    plan = response.json()
    assert plan["status"] == "draft" and plan["violations"] == []
    return plan


def ids(plan: dict) -> list[str]:
    return [item["program_id"] for item in plan["items"]]


def stored(sync_db, plan_id: str) -> dict:
    with sync_db.connect() as conn:
        row = conn.execute(
            text("SELECT status, items, monthly_total FROM plans WHERE id = :id"), {"id": plan_id}
        )
        return dict(row.mappings().one())


def denials(sync_db, account_id: str, target: str) -> int:
    with sync_db.connect() as conn:
        return conn.scalar(
            text(
                "SELECT count(*) FROM audit_events"
                " WHERE kind = 'access_denied_404' AND account_id = :account AND target = :target"
            ),
            {"account": account_id, "target": target},
        )


def test_removing_an_english_program_drops_it_and_its_monthly_cost(parent) -> None:  # AC-08.1
    plan = draft(parent)
    english = next(item for item in plan["items"] if item["subject"] == "영어")
    keep = [pid for pid in ids(plan) if pid != english["program_id"]]

    response = parent.put(f"/api/plans/{plan['id']}", json={"program_ids": keep})

    assert response.status_code == 200, response.text
    updated = response.json()
    assert ids(updated) == keep
    assert updated["status"] == "draft"
    cost = english["monthly_tuition"] + english["monthly_other"]
    assert updated["monthly_total"] == plan["monthly_total"] - cost
    reloaded = parent.get(f"/api/plans/{plan['id']}").json()
    assert reloaded["monthly_total"] == updated["monthly_total"]


def test_swapping_in_a_school_time_program_is_saved_with_time_overlap(  # AC-08.2
    parent, school_overlap
) -> None:
    plan = draft(parent)
    english = next(item for item in plan["items"] if item["subject"] == "영어")
    swapped = [school_overlap if pid == english["program_id"] else pid for pid in ids(plan)]

    response = parent.put(f"/api/plans/{plan['id']}", json={"program_ids": swapped})

    assert response.status_code == 200, response.text
    body = response.json()
    assert ids(body) == swapped
    assert {"program_id": school_overlap, "kind": "time_overlap", "amount": None} in body[
        "violations"
    ]
    # the reloaded draft shows the same violation (the screen keeps 확정 disabled)
    again = parent.get(f"/api/plans/{plan['id']}").json()
    assert again["violations"] == body["violations"]


def test_confirm_with_violations_is_409_and_leaves_the_draft(  # AC-08.2, AD-5
    parent, school_overlap, sync_db
) -> None:
    plan = draft(parent)
    swapped = [school_overlap, *ids(plan)[1:]]
    assert parent.put(f"/api/plans/{plan['id']}", json={"program_ids": swapped}).status_code == 200
    before = stored(sync_db, plan["id"])

    response = parent.post(f"/api/plans/{plan['id']}/confirm")

    assert response.status_code == 409
    assert response.json()["detail"] == "violations"
    kinds = {(v["program_id"], v["kind"]) for v in response.json()["data"]["violations"]}
    assert (school_overlap, "time_overlap") in kinds
    assert stored(sync_db, plan["id"]) == before


def test_confirmed_plan_is_listed_and_survives_sign_in_again(parent) -> None:  # AC-08.3
    plan = draft(parent)

    response = parent.post(f"/api/plans/{plan['id']}/confirm")

    assert response.status_code == 200, response.text
    confirmed = response.json()
    assert confirmed["status"] == "confirmed" and confirmed["violations"] == []
    assert ids(confirmed) == ids(plan) and confirmed["monthly_total"] == plan["monthly_total"]
    assert confirmed["budget_cap"] == BASE["budget_cap"] and confirmed["school"]

    assert parent.post("/api/auth/logout").status_code == 204
    assert login(parent, "parent1").status_code == 200
    for url in ("/api/plans", f"/api/plans?child_id={CHILD}"):
        listed = parent.get(url).json()
        assert listed[0]["id"] == plan["id"] and listed[0]["status"] == "confirmed"
        assert ids(listed[0]) == ids(plan)
    assert parent.get(f"/api/plans/{plan['id']}").json()["status"] == "confirmed"


def test_second_confirm_supersedes_the_first(parent, sync_db) -> None:  # arch 확정 row
    first = draft(parent)
    assert parent.post(f"/api/plans/{first['id']}/confirm").status_code == 200
    second = draft(parent)

    assert parent.post(f"/api/plans/{second['id']}/confirm").status_code == 200

    assert stored(sync_db, first["id"])["status"] == "superseded"
    listed = parent.get("/api/plans").json()
    assert [p["id"] for p in listed if p["status"] == "confirmed"] == [second["id"]]
    assert first["id"] not in {p["id"] for p in listed}


def test_confirmed_plan_cannot_be_edited_or_confirmed_again(parent, sync_db) -> None:
    plan = draft(parent)
    assert parent.post(f"/api/plans/{plan['id']}/confirm").status_code == 200
    before = stored(sync_db, plan["id"])

    edit = parent.put(f"/api/plans/{plan['id']}", json={"program_ids": ids(plan)[:1]})
    again = parent.post(f"/api/plans/{plan['id']}/confirm")

    assert (edit.status_code, edit.json()["detail"]) == (409, "plan_not_draft")
    assert (again.status_code, again.json()["detail"]) == (409, "plan_not_draft")
    assert stored(sync_db, plan["id"]) == before
    assert [i["program_id"] for i in before["items"]] == ids(plan)


@pytest.mark.parametrize(
    ("program_ids", "code"),
    [([], "empty_plan"), (["dup", "dup"], "duplicate_program"), (["nope"], "unknown_program")],
)
def test_bad_program_lists_are_422(parent, program_ids, code) -> None:
    plan = draft(parent)
    response = parent.put(f"/api/plans/{plan['id']}", json={"program_ids": program_ids})
    assert (response.status_code, response.json()["detail"]) == (422, code)


def test_unpublished_or_other_grade_program_cannot_be_swapped_in(parent) -> None:
    plan = draft(parent)
    for key in ("b-elem-math-undisclosed", "a-mid1-math", "c-elem-english-full"):
        response = parent.put(
            f"/api/plans/{plan['id']}", json={"program_ids": [str(load.seed_id(key))]}
        )
        assert (response.status_code, response.json()["detail"]) == (422, "unknown_program"), key


def test_other_parent_gets_404_with_one_audit_row_each(parent, sync_db) -> None:  # AD-8
    plan = draft(parent)
    assert login(parent, "parent2").status_code == 200
    calls = [
        ("GET", f"/api/plans/{plan['id']}", None, f"/api/plans/{plan['id']}"),
        ("PUT", f"/api/plans/{plan['id']}", {"program_ids": ids(plan)}, f"/api/plans/{plan['id']}"),
        ("POST", f"/api/plans/{plan['id']}/confirm", None, f"/api/plans/{plan['id']}/confirm"),
        ("GET", f"/api/plans?child_id={CHILD}", None, f"/api/plans?child_id={CHILD}"),
    ]
    for method, url, body, target in calls:
        before = denials(sync_db, PARENT2, target)
        response = parent.request(method, url, json=body)
        assert (response.status_code, response.json()) == (404, {"detail": "not_found"}), url
        assert denials(sync_db, PARENT2, target) == before + 1, url
    assert plan["id"] not in {p["id"] for p in parent.get("/api/plans").json()}
    assert stored(sync_db, plan["id"])["status"] == "draft"


def test_signed_out_is_401(parent) -> None:
    plan = draft(parent)
    parent.cookies.clear()
    assert parent.get("/api/plans").status_code == 401
    assert parent.put(f"/api/plans/{plan['id']}", json={"program_ids": []}).status_code == 401
    assert parent.post(f"/api/plans/{plan['id']}/confirm").status_code == 401
