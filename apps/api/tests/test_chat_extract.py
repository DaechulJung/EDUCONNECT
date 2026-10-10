"""REQ-05 condition extraction without a database: rules, budget phrasing, LLM and fallback."""

import asyncio

import pytest

from app.ai import fake
from app.ai.none import NoneProvider
from app.schemas.chat import Conditions
from app.services.chat.conditions import merge, reply_text
from app.services.chat.extract import (
    BASE_SUBJECTS,
    TASK,
    Extracted,
    budget_range,
    extract,
    rule_extract,
)

AROUND = "초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게"  # AC-05.1
WITHIN = "초5 아이 영어·수학 위주로 월 100만원 안에서 촘촘하게"  # AC-05.2
KNOWN = list(BASE_SUBJECTS)
CHILD = "별칭 하늘, 학년 초5, 관심사 없음"
LLM_AROUND = {
    "subjects": ["영어", "수학"],
    "budget_amount": 1_000_000,
    "budget_mode": "around",
    "types": [],
    "days": [],
    "density": "tight",
}


@pytest.fixture(autouse=True)
def _fresh_fake():
    fake.provider.reset()
    yield
    fake.provider.reset()


def run(coro):
    return asyncio.run(coro)


def card(found: Extracted) -> Conditions:
    return merge("c1", None, found)


def test_rules_read_the_demo_sentence() -> None:
    found = rule_extract(AROUND, KNOWN)
    assert found.subjects == ["영어", "수학"]
    assert budget_range(found) == (1_000_000, 1_100_000)
    assert found.density == "tight"
    assert found.days == [] and found.types == []


def test_within_means_target_equals_cap() -> None:
    assert budget_range(rule_extract(WITHIN, KNOWN)) == (1_000_000, 1_000_000)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("월 80만원 정도", (800_000, 880_000)),
        ("월 1,200,000원 이하", (1_200_000, 1_200_000)),
        ("월 50만원", (500_000, 500_000)),
        ("예산은 아직 몰라요", None),
    ],
)
def test_budget_phrasing(text, expected) -> None:
    assert budget_range(rule_extract(text, KNOWN)) == expected


@pytest.mark.parametrize(
    ("text", "days"),
    [
        ("월·수·금에만 보내고 싶어요", ["mon", "wed", "fri"]),
        ("화요일과 목요일", ["tue", "thu"]),
        ("평일 저녁", ["mon", "tue", "wed", "thu", "fri"]),
        ("주말에만", ["sat", "sun"]),
        ("월 100만원 수학 일정", []),  # 월 = month, 수학·일정 are not days
    ],
)
def test_days(text, days) -> None:
    assert rule_extract(text, KNOWN).days == days


def test_types_and_catalog_subjects() -> None:
    found = rule_extract("교과 학원이랑 방과후로 피아노·로봇", [*KNOWN, "로봇"])
    assert found.types == ["after_school", "academy"]
    assert found.subjects == ["피아노", "로봇"]


def test_llm_answer_is_used_with_budget_resolved_in_code() -> None:
    fake.provider.configure(TASK, "fixed", LLM_AROUND)
    found, source = run(extract(AROUND, child=CHILD, known_subjects=KNOWN, provider=fake.provider))
    assert source == "llm"
    shown = card(found)
    assert (shown.subjects, shown.budget_target, shown.budget_cap, shown.density) == (
        ["영어", "수학"],
        1_000_000,
        1_100_000,
        "tight",
    )
    request = fake.provider.requests[0]
    assert request["task"] == TASK
    assert request["messages"][-1] == {"role": "user", "content": AROUND}
    assert CHILD in request["messages"][0]["content"]  # alias·grade·interests only (AD-10)


@pytest.mark.parametrize(
    ("mode", "response"),
    [
        ("bad_json", None),  # AC-05.6
        ("error", None),
        ("fixed", {**LLM_AROUND, "extra": 1}),  # schema mismatch
        ("fixed", {**LLM_AROUND, "budget_amount": -5}),  # passes schema, fails range check
        ("fixed", {**LLM_AROUND, "types": ["학원"]}),
    ],
)
def test_llm_failures_fall_back_to_the_same_card(mode, response) -> None:
    fake.provider.configure(TASK, mode, response)
    found, source = run(extract(AROUND, child=CHILD, known_subjects=KNOWN, provider=fake.provider))
    assert source == "fallback"
    assert card(found) == card(rule_extract(AROUND, KNOWN))


def test_no_key_falls_back_to_the_same_card() -> None:  # AC-05.5
    found, source = run(extract(AROUND, child=CHILD, known_subjects=KNOWN, provider=NoneProvider()))
    llm_like = Extracted.model_validate(LLM_AROUND)
    assert source == "fallback"
    assert card(found) == card(llm_like)


def test_merge_keeps_saved_values_the_sentence_did_not_mention() -> None:
    saved = Conditions(
        child_id="c1",
        subjects=["영어"],
        budget_target=1_000_000,
        budget_cap=1_000_000,
        types=["academy"],
        days=["mon", "wed", "fri"],
        density="normal",
    )
    draft = merge("c1", saved, rule_extract("수학도 넣고 촘촘하게", KNOWN))
    assert draft.subjects == ["수학"]
    assert (draft.budget_target, draft.budget_cap) == (1_000_000, 1_000_000)
    assert draft.types == ["academy"] and draft.days == ["mon", "wed", "fri"]
    assert draft.density == "tight"


def test_reply_puts_the_result_first() -> None:
    found = rule_extract(AROUND, KNOWN)
    reply = reply_text(card(found), found)
    assert reply.startswith("영어·수학, 월 1,000,000원(상한 1,100,000원), 촘촘하게")
    nothing = rule_extract("안녕하세요", KNOWN)
    assert "찾지 못했어요" in reply_text(card(nothing), nothing)
