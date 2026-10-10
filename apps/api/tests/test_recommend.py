"""REQ-06 recommendations on the seed (AC-06.1, 06.3~06.7; TC-40 is the API order check).

Every test starts from POST /api/test/reset and signs in as the seed parent of 하늘(초5).
Rows are not pinned: the checks are properties (subjects, exclusions, order, conditions).
"""

import re

import pytest
from fastapi.testclient import TestClient

from app.ai import fake
from app.core.config import Settings, settings
from app.main import create_app
from app.seed import load
from app.services.planner.recommend import TASK
from tests.conftest import login

CHILD = str(load.seed_id("child-elem5"))
OTHER_CHILD = str(load.seed_id("child-mid1"))
BASE = {  # 기준 시나리오: 초5, 영어·수학, 목표 1,000,000·상한 1,100,000, 촘촘하게
    "subjects": ["영어", "수학"],
    "budget_target": 1_000_000,
    "budget_cap": 1_100_000,
    "types": [],
    "days": [],
    "density": "tight",
}
COLUMNS = {
    "program_id",
    "institution_name",
    "subject",
    "type",
    "days",
    "start",
    "end",
    "monthly_tuition",
    "monthly_other",
    "travel_km",
    "travel_min",
    "reason",
    "reason_source",
}


@pytest.fixture(scope="module")
def seeded() -> TestClient:
    with TestClient(create_app(Settings(enable_test_routes=True))) as client:
        yield client


@pytest.fixture
def parent(seeded: TestClient, monkeypatch) -> TestClient:
    assert seeded.post("/api/test/reset").json() == {"reset": True}
    monkeypatch.setattr(settings, "llm_provider", "fake")
    fake.provider.reset()
    assert login(seeded, "parent1").status_code == 200
    yield seeded
    fake.provider.reset()


def save(client: TestClient, conditions: dict) -> None:
    assert client.put(f"/api/children/{CHILD}/conditions", json=conditions).status_code == 200


def recommend(client: TestClient, child_id: str = CHILD):
    return client.post("/api/recommendations", json={"child_id": child_id})


def items(client: TestClient) -> list[dict]:
    response = recommend(client)
    assert response.status_code == 200
    return response.json()["items"]


def test_base_scenario_rows_have_every_column_and_only_english_or_math(parent) -> None:  # AC-06.1
    save(parent, BASE)
    rows = items(parent)
    assert rows
    for row in rows:
        assert set(row) == COLUMNS
        assert row["subject"] in {"영어", "수학"}
        assert row["institution_name"] and row["reason"]
        assert row["travel_min"] >= 0 and row["travel_km"] >= 0


def test_grade_mismatch_full_and_undisclosed_programs_are_left_out(parent) -> None:  # AC-06.3
    save(parent, BASE)
    shown = {row["program_id"] for row in items(parent)}
    for key in ("a-mid1-math", "c-elem-english-full", "b-elem-math-undisclosed"):
        assert str(load.seed_id(key)) not in shown, key


def test_reasons_request_carries_the_interest_and_reasons_come_from_the_model(parent) -> None:
    # AC-06.4: interests 과학 (saved through PUT /api/children/{id}, #4 API) reach the model.
    child = next(c for c in parent.get("/api/children").json() if c["id"] == CHILD)
    body = {k: v for k, v in child.items() if k != "id"} | {"interests": ["과학"]}
    assert parent.put(f"/api/children/{CHILD}", json=body).status_code == 200
    save(parent, BASE)
    ids = [row["program_id"] for row in items(parent)]  # the double errors: template reasons
    reasons = [
        {"program_id": pid, "reason": f"과학을 좋아하는 아이에게 맞는 수업 {n}"}
        for n, pid in enumerate(ids)
    ]
    fake.provider.configure(TASK, "fixed", {"reasons": reasons})
    fake.provider.requests.clear()

    rows = items(parent)
    sent = [r for r in fake.provider.requests if r["task"] == TASK]
    assert len(sent) == 1
    assert "관심사 과학" in sent[0]["messages"][0]["content"]
    assert [row["reason_source"] for row in rows] == ["llm"] * len(rows)
    assert all(row["reason"].startswith("과학을 좋아하는") for row in rows)


def test_model_error_gives_template_reasons_with_the_same_rows(parent) -> None:  # AC-06.5
    save(parent, BASE)
    fake.provider.configure(TASK, "error")
    rows = items(parent)
    fake.provider.configure(TASK, "bad_json")
    assert [row["program_id"] for row in items(parent)] == [row["program_id"] for row in rows]
    for row in rows:
        assert row["reason_source"] == "template"
        assert row["subject"] in row["reason"]
        assert f"주 {len(row['days'])}회" in row["reason"]
        assert f"{row['travel_min']}분" in row["reason"]


def test_same_conditions_give_the_same_order(parent) -> None:  # AC-06.6, TC-40
    save(parent, BASE)
    first = [row["program_id"] for row in items(parent)]
    second = [row["program_id"] for row in items(parent)]
    assert first and first == second


def test_type_and_days_conditions_bound_every_row(parent) -> None:  # AC-06.7
    save(
        parent,
        {**BASE, "budget_cap": 1_000_000, "types": ["academy"], "days": ["mon", "wed", "fri"]},
    )
    rows = items(parent)
    assert rows
    for row in rows:
        assert row["type"] == "academy"
        assert set(row["days"]) <= {"mon", "wed", "fri"}


def test_other_parents_child_is_not_found(parent) -> None:  # AD-8
    response = recommend(parent, OTHER_CHILD)
    assert response.status_code == 404
    assert "바다" not in response.text


CODE_TOKEN = re.compile(
    r"(?<![A-Za-z])(tight|normal|mon|tue|wed|thu|fri|sat|sun|academy|arts|other|after_school)"
    r"(?![A-Za-z])"
)


def test_prompt_sends_labels_not_codes(parent) -> None:  # AC-06.1, preview 결함(코드값 'tight')
    save(parent, {**BASE, "days": ["mon", "wed", "fri"]})
    fake.provider.requests.clear()
    items(parent)
    sent = [r for r in fake.provider.requests if r["task"] == TASK]
    assert len(sent) == 1
    text = "\n".join(m["content"] for m in sent[0]["messages"])
    assert "밀도 촘촘하게" in text and "요일 월·수·금" in text
    assert CODE_TOKEN.findall(text) == []


def test_code_tokens_in_model_reasons_become_labels(parent) -> None:  # AC-06.1
    save(parent, BASE)
    ids = [row["program_id"] for row in items(parent)]
    reason = "tight 일정, mon요일·wed 수업(academy)"
    reasons = [{"program_id": pid, "reason": reason} for pid in ids]
    fake.provider.configure(TASK, "fixed", {"reasons": reasons})

    rows = items(parent)
    assert [row["reason_source"] for row in rows] == ["llm"] * len(rows)
    for row in rows:
        assert row["reason"] == "촘촘하게 일정, 월요일·수 수업(교과 학원)"


def test_empty_days_mean_monday_to_friday(parent) -> None:  # #5 회귀 05-2
    # experience 157행: 가능 요일의 기본값은 월~금.
    # 시드의 미술(리듬피아노미술학원)은 토요일 반뿐이다.
    save(parent, {**BASE, "subjects": ["미술"], "budget_cap": 1_100_000, "days": []})
    assert items(parent) == []
    save(parent, {**BASE, "subjects": ["미술"], "days": ["sat"]})
    assert [r["subject"] for r in items(parent)] == ["미술"]
