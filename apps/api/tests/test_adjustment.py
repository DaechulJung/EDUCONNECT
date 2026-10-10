"""REQ-09 impact·adjustment API (AC-09.1~09.7 server side; TC-50~56 are the screen E2E).

Every test starts from POST /api/test/reset and the seed parent of 하늘(초5). The confirmed plan
comes from the saved conditions; organization changes go through the real catalog PUT routes.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.seed import load
from tests.conftest import login
from tests.test_plans import BASE, CHILD, draft, ids, parent, stored  # noqa: F401

MATH = load.seed_id("a-elem-math")
ESSAY = load.seed_id("e-essay")
SEED_MATH = {  # a-elem-math as seeded (academy A location)
    "subject": "수학", "type": "academy", "days": ["tue", "fri"], "start": "15:00",
    "end": "16:30", "monthly_tuition": 470000, "monthly_other": 40000, "instructor": "박도윤",
    "grade_min": 5, "grade_max": 6, "capacity": 10, "enrolled": 6, "lat": 37.5015, "lng": 127.032,
}  # fmt: skip


def confirmed(client: TestClient) -> dict:
    plan = draft(client)
    response = client.post(f"/api/plans/{plan['id']}/confirm")
    assert response.status_code == 200, response.text
    return response.json()


def change_math(client: TestClient, **fields) -> None:
    login(client, "academy-a")
    response = client.put(f"/api/academy/programs/{MATH}", json={**SEED_MATH, **fields})
    assert response.status_code == 200, response.text


def listed(client: TestClient, plan_id: str) -> dict:
    login(client, "parent1")
    return next(p for p in client.get("/api/plans").json() if p["id"] == plan_id)


def kinds(plan: dict) -> list[str]:
    return [r["kind"] for r in plan["impact"]["reasons"]]


@pytest.fixture
def overlapped(parent) -> dict:  # noqa: F811
    """AC-09.1: 학원 A 수학(화·금 15:00)을 14:00 시작으로 옮겨 초5 하교 14:40과 겹치게 한다."""
    plan = confirmed(parent)
    assert str(MATH) in ids(plan)
    change_math(parent, start="14:00", end="15:30")
    return plan


def test_moving_a_program_into_school_hours_marks_the_plan(parent, overlapped) -> None:  # noqa: F811
    # AC-09.1 org count, AC-09.2 parent tag
    login(parent, "academy-a")
    assert parent.get("/api/org/impact", params={"program_id": str(MATH)}).json() == {
        "affected_plans": 1,
        "items": [{"program_id": str(MATH), "grade": None, "affected_plans": 1}],
    }
    plan = listed(parent, overlapped["id"])
    assert plan["impact"]["affected"] is True
    assert kinds(plan) == ["time_overlap"]


def test_org_impact_has_counts_only(parent, overlapped) -> None:  # noqa: F811  AC-09.7, SEC-03·07
    login(parent, "academy-a")
    body = parent.get("/api/org/impact").json()
    assert body["affected_plans"] == 1
    assert set(body) == {"affected_plans", "items"}
    assert all(set(i) == {"program_id", "grade", "affected_plans"} for i in body["items"])
    text_ = str(body)
    for leaked in ("하늘", CHILD, overlapped["id"], "parent1"):
        assert leaked not in text_
    # 다른 학원 담당자는 자기 프로그램만 센다
    login(parent, "academy-b")
    assert parent.get("/api/org/impact", params={"program_id": str(MATH)}).json() == {
        "affected_plans": 0,
        "items": [],
    }


def test_raising_tuition_past_the_cap_shows_the_overage(parent) -> None:  # noqa: F811  AC-09.3
    login(parent, "academy-a")
    assert (
        parent.put(
            f"/api/academy/programs/{MATH}", json={**SEED_MATH, "monthly_tuition": 530_000}
        ).status_code
        == 200
    )
    login(parent, "parent1")
    plan = confirmed(parent)
    assert plan["monthly_total"] == 1_050_000 and plan["budget_cap"] == 1_100_000
    change_math(parent, monthly_tuition=630_000)
    after = listed(parent, plan["id"])
    assert after["impact"]["affected"] is True
    assert after["impact"]["reasons"] == [
        {"kind": "over_budget", "program_id": None, "amount": 50_000}
    ]


@pytest.fixture
def overlapped_normal(parent) -> dict:  # noqa: F811
    """AC-09.4: '촘촘하게'면 시드에서 학원 A 15:00 반 말고는 공백 30분을 넘어 대안이 없다.
    여유 있는 밀도로 확정한 뒤 같은 변경(학원 A 수학을 학교 시간으로)을 한다."""
    conditions = {**BASE, "density": "normal"}
    assert parent.put(f"/api/children/{CHILD}/conditions", json=conditions).status_code == 200
    plan = confirmed(parent)
    assert str(MATH) in ids(plan)
    change_math(parent, start="14:00", end="15:30")
    return plan


def test_accepting_the_adjustment_replaces_the_plan(parent, overlapped_normal, sync_db) -> None:  # noqa: F811
    # AC-09.4
    overlapped = overlapped_normal
    login(parent, "parent1")
    adj = parent.get(f"/api/plans/{overlapped['id']}/adjustment")
    assert adj.status_code == 200, adj.text
    body = adj.json()
    assert [r["kind"] for r in body["reasons"]] == ["time_overlap"]
    assert body["violations"] == [] and str(MATH) not in [i["program_id"] for i in body["proposal"]]

    accepted = parent.post(f"/api/plans/{overlapped['id']}/adjustment/accept")
    assert accepted.status_code == 200, accepted.text
    new = accepted.json()
    assert new["id"] != overlapped["id"] and new["status"] == "confirmed"
    assert ids(new) == [i["program_id"] for i in body["proposal"]]
    assert stored(sync_db, overlapped["id"])["status"] == "superseded"
    plans = parent.get("/api/plans").json()
    assert [p["id"] for p in plans] == [new["id"]]
    assert plans[0]["impact"] == {"affected": False, "reasons": []}


def test_rejecting_keeps_the_plan_and_the_tag(parent, overlapped, sync_db) -> None:  # noqa: F811  AC-09.5
    login(parent, "parent1")
    before = stored(sync_db, overlapped["id"])
    rejected = parent.post(f"/api/plans/{overlapped['id']}/adjustment/reject")
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["impact"]["affected"] is True
    assert stored(sync_db, overlapped["id"]) == before
    assert kinds(listed(parent, overlapped["id"])) == ["time_overlap"]


@pytest.fixture
def wednesday(parent) -> dict:  # noqa: F811
    """논술만 원하면 수요일 15:00 코딩랩 논술 하나로 확정된다(초5 수 하교 13:40)."""
    conditions = {**BASE, "subjects": ["논술"], "density": "normal"}
    assert parent.put(f"/api/children/{CHILD}/conditions", json=conditions).status_code == 200
    plan = confirmed(parent)
    assert ids(plan) == [str(ESSAY)]
    return plan


def test_later_dismissal_without_alternative_shows_relaxations(parent, wednesday, sync_db):  # noqa: F811
    # AC-09.6
    login(parent, "school-elem")
    entries = [{"grade": 5, "dow": "wed", "dismissal": "15:30"}]
    assert parent.put("/api/school/timetable", json={"entries": entries}).status_code == 200
    assert parent.get("/api/org/impact", params={"grade": 5}).json() == {
        "affected_plans": 1,
        "items": [{"program_id": None, "grade": 5, "affected_plans": 1}],
    }

    assert kinds(listed(parent, wednesday["id"])) == ["time_overlap"]
    adj = parent.get(f"/api/plans/{wednesday['id']}/adjustment")
    assert adj.status_code == 422
    assert adj.json()["detail"] == "no_feasible_plan"
    assert adj.json()["data"]["relaxations"]
    before = stored(sync_db, wednesday["id"])
    assert parent.post(f"/api/plans/{wednesday['id']}/adjustment/accept").status_code == 422
    assert stored(sync_db, wednesday["id"]) == before


def test_deleted_program_is_content_changed_and_counted(parent) -> None:  # noqa: F811  PR #29 a
    # PRD 196행 "바꾸거나 지우면 REQ-09 영향 처리", experience 82·185행 '영향 있음 · 내용 변경'
    plan = confirmed(parent)
    login(parent, "academy-a")
    assert parent.delete(f"/api/academy/programs/{MATH}").status_code in (200, 204)
    after = listed(parent, plan["id"])
    assert after["impact"] == {
        "affected": True,
        "reasons": [{"kind": "content_changed", "program_id": str(MATH), "amount": None}],
    }
    login(parent, "academy-a")
    assert parent.get("/api/org/impact").json()["affected_plans"] == 1


def test_time_change_without_violation_is_content_changed(parent) -> None:  # noqa: F811  PR #29 a
    plan = confirmed(parent)
    change_math(parent, start="15:10", end="16:40")
    after = listed(parent, plan["id"])
    assert after["impact"]["affected"] is True
    assert kinds(after) == ["content_changed"]
    login(parent, "academy-a")
    assert (
        parent.get("/api/org/impact", params={"program_id": str(MATH)}).json()["affected_plans"]
        == 1
    )


def test_confirmed_plan_shows_current_school_times(parent, wednesday) -> None:  # noqa: F811
    # PR #29 Codex P2 1: school blocks show today's dismissal, not the confirm-time snapshot
    # (experience 78·181행: what broke and the alternative on one screen).
    login(parent, "school-elem")
    entries = [{"grade": 5, "dow": "wed", "dismissal": "15:30"}]
    assert parent.put("/api/school/timetable", json={"entries": entries}).status_code == 200
    plan = listed(parent, wednesday["id"])
    assert plan["school"]["wed"] == "15:30"
    assert parent.get(f"/api/plans/{wednesday['id']}").json()["school"]["wed"] == "15:30"


TWO_ACADEMIES = {**BASE, "subjects": ["수학", "논술"], "density": "normal"}


def change_essay(client: TestClient, **fields) -> None:
    login(client, "academy-e")
    current = next(p for p in client.get("/api/academy/programs").json() if p["id"] == str(ESSAY))
    body = {k: v for k, v in current.items() if k not in ("id", "institution_id")}
    response = client.put(f"/api/academy/programs/{ESSAY}", json={**body, **fields})
    assert response.status_code == 200, response.text


@pytest.fixture
def two_academies(parent) -> dict:  # noqa: F811
    """학원 A 수학(화·금 15:00)과 학원 E 논술(수 15:00)이 함께 든 확정 계획."""
    assert parent.put(f"/api/children/{CHILD}/conditions", json=TWO_ACADEMIES).status_code == 200
    plan = confirmed(parent)
    assert set(ids(plan)) == {str(MATH), str(ESSAY)}
    return plan


def counts(client: TestClient, login_id: str, **params) -> int:
    login(client, login_id)
    return client.get("/api/org/impact", params=params).json()["affected_plans"]


def test_org_count_is_only_the_academy_whose_change_broke_it(parent, two_academies) -> None:  # noqa: F811
    # PR #29 Codex P2 2: experience 37행 "이 기관 변경으로 영향받는 계획 수"
    change_essay(parent, start="13:00", end="14:30")  # 초5 수 하교 13:40과 겹침
    assert kinds(listed(parent, two_academies["id"])) == ["time_overlap"]
    assert counts(parent, "academy-e") == 1
    assert counts(parent, "academy-a") == 0
    assert counts(parent, "academy-a", program_id=str(MATH)) == 0
    assert counts(parent, "school-elem", grade=5) == 0  # 하교 시각은 그대로


def test_over_budget_counts_for_the_academy_that_raised_it(parent, two_academies) -> None:  # noqa: F811
    change_essay(parent, monthly_tuition=1_000_000)
    assert kinds(listed(parent, two_academies["id"])) == ["over_budget"]
    assert counts(parent, "academy-e") == 1
    assert counts(parent, "academy-a") == 0


def test_school_count_needs_a_changed_dismissal(parent, overlapped) -> None:  # noqa: F811
    # 학원 A가 수학을 학교 시간으로 옮긴 위반은 학교 변경 때문이 아니다
    assert counts(parent, "school-elem", grade=5) == 0
    assert counts(parent, "academy-a") == 1


def test_adjustment_needs_a_confirmed_plan_of_your_own(parent) -> None:  # noqa: F811  AD-8
    plan = draft(parent)
    assert parent.get(f"/api/plans/{plan['id']}/adjustment").status_code == 409
    assert parent.post(f"/api/plans/{plan['id']}/adjustment/reject").status_code == 409
    for path in ("adjustment", "adjustment/accept", "adjustment/reject"):
        url = f"/api/plans/{uuid.uuid4()}/{path}"
        assert (parent.get(url) if path == "adjustment" else parent.post(url)).status_code == 404
    login(parent, "parent2")
    assert parent.get(f"/api/plans/{plan['id']}/adjustment").status_code == 404
    assert parent.get("/api/org/impact").status_code == 403
    parent.cookies.clear()
    assert parent.get("/api/org/impact").status_code == 401
