"""엔진 단위 시험 (TC-41·42·43·44·46). 입력은 기준 시나리오 모양의 고정 데이터다.

시드(#11)가 병합되면 같은 판정을 시드 JSON 입력으로도 돌린다.
"""

import math

import pytest

from app.services.planner.engine import (
    OVER_BUDGET,
    RELAX_BUDGET,
    TIME_OVERLAP,
    TRAVEL_SHORT,
    Conditions,
    Context,
    Event,
    NoFeasiblePlan,
    Plan,
    Program,
    day_gaps,
    eligible,
    generate,
    monthly_total,
    recommend,
    validate,
    weekly_counts,
)
from app.services.planner.travel import haversine_km, travel_minutes

SCHOOL = (37.5000, 127.0000)
NEAR = (37.5045, 127.0000)  # 약 0.5km
MID = (37.5090, 127.0000)  # 약 1km
FAR = (37.5900, 127.0000)  # 약 10km

MON, TUE, WED, THU, FRI = 0, 1, 2, 3, 4


def hm(text: str) -> int:
    h, m = text.split(":")
    return int(h) * 60 + int(m)


def prog(
    pid,
    name,
    subject,
    days,
    start,
    end,
    tuition,
    other=0,
    *,
    loc=NEAR,
    ptype="academy",
    grade=(4, 6),
    cap=10,
    enrolled=0,
):
    return Program(
        id=pid,
        institution_name=name,
        type=ptype,
        subject=subject,
        days=tuple(days),
        start_min=hm(start),
        end_min=hm(end),
        monthly_tuition=tuition,
        monthly_other=other,
        grade_min=grade[0],
        grade_max=grade[1],
        capacity=cap,
        enrolled=enrolled,
        location=loc,
    )


PROGRAMS = (
    prog("p-a-eng", "가온영어", "영어", (MON, WED), "15:00", "16:30", 280_000, 20_000),
    prog("p-b-math", "바른수학", "수학", (TUE, THU), "15:00", "16:30", 330_000, 20_000),
    prog("p-c-eng", "새봄어학원", "영어", (TUE, THU), "17:00", "18:30", 250_000, 10_000, loc=MID),
    prog("p-d-math", "다온수학", "수학", (MON, WED), "17:00", "18:30", 170_000, 10_000, loc=MID),
    prog("p-e-piano", "라온음악", "피아노", (FRI,), "15:00", "16:00", 150_000, ptype="arts"),
    prog("p-x-mid", "바른수학", "수학", (MON, WED), "15:00", "16:30", 300_000, grade=(7, 7)),
    prog("p-x-full", "가온영어", "영어", (TUE, THU), "15:00", "16:00", 200_000, cap=8, enrolled=8),
    prog("p-x-undisclosed", "새봄어학원", "영어", (FRI,), "15:00", "16:00", None),
)
CTX = Context(grade=5, school_location=SCHOOL, dismissal={d: hm("14:30") for d in range(5)})
BASE = Conditions(
    subjects=("영어", "수학"), budget_target=1_000_000, budget_cap=1_100_000, density="tight"
)


def base_plan() -> Plan:
    plan = generate(PROGRAMS, CTX, BASE)
    assert isinstance(plan, Plan)
    return plan


def test_travel_formula():
    km = haversine_km(SCHOOL, FAR)
    assert 9.9 < km < 10.1
    assert travel_minutes(SCHOOL, FAR) == math.ceil(km * 1.4 / 15 * 60)
    assert travel_minutes(SCHOOL, NEAR) == 5  # 최소 5분
    assert travel_minutes(SCHOOL, SCHOOL) == 0  # 방과후 = 학교 좌표
    assert travel_minutes(None, NEAR) == 0


def test_eligible_excludes_grade_full_and_undisclosed():
    ids = {p.id for p in eligible(PROGRAMS, CTX, BASE)}
    assert ids == {"p-a-eng", "p-b-math", "p-c-eng", "p-d-math"}


def test_eligible_filters_type_and_days():
    cond = Conditions(
        subjects=(), budget_target=0, budget_cap=10**7, types=("arts",), days=(MON, WED, FRI)
    )
    assert [p.id for p in eligible(PROGRAMS, CTX, cond)] == ["p-e-piano"]


def test_tc41_no_overlap_in_generated_plan():
    plan = base_plan()
    assert plan.violations == ()
    assert not [v for v in validate(plan.programs, CTX, BASE.budget_cap) if v.kind == TIME_OVERLAP]


def test_tc42_no_travel_shortage():
    plan = base_plan()
    assert all(g >= 0 for gs in day_gaps(plan.programs, CTX).values() for g in gs)


def test_tc43_total_is_sum_of_costs_and_under_cap():
    plan = base_plan()
    expected = sum((p.monthly_tuition or 0) + p.monthly_other for p in plan.programs)
    assert plan.monthly_total == expected == monthly_total(plan.programs)
    assert plan.monthly_total <= 1_100_000


def test_tc44_success_criterion_3():
    plan = base_plan()
    assert 900_000 <= plan.monthly_total <= 1_100_000
    counts = weekly_counts(plan.programs)
    assert counts.get("영어", 0) >= 2 and counts.get("수학", 0) >= 2
    gaps = day_gaps(plan.programs, CTX)
    assert gaps and all(g <= 30 for gs in gaps.values() for g in gs)


def test_tc46_same_input_same_plan():
    first = base_plan()
    second = generate(tuple(reversed(PROGRAMS)), CTX, BASE)
    assert first.items() == second.items()


def test_items_have_ad16_shape():
    item = base_plan().items()[0]
    assert set(item) == {
        "program_id",
        "days",
        "start_min",
        "end_min",
        "monthly_tuition",
        "monthly_other",
        "subject",
    }


def test_no_feasible_plan_names_budget_relaxation():
    cond = Conditions(subjects=("영어", "수학"), budget_target=100_000, budget_cap=100_000)
    result = generate(PROGRAMS, CTX, cond)
    assert isinstance(result, NoFeasiblePlan)
    assert RELAX_BUDGET in result.relaxations


def test_validate_school_overlap_travel_shortage_and_budget():
    clash = prog("p-clash", "가온영어", "영어", (MON,), "14:00", "15:00", 100_000)
    far = prog("p-far", "먼수학", "수학", (TUE,), "14:35", "15:30", 100_000, loc=FAR)
    found = validate((clash, far), CTX, budget_cap=150_000)
    assert {(v.program_id, v.kind) for v in found} == {
        ("p-clash", TIME_OVERLAP),
        ("p-far", TRAVEL_SHORT),
        (None, OVER_BUDGET),
    }
    assert next(v.amount for v in found if v.kind == OVER_BUDGET) == 50_000


def test_existing_event_overlap_without_location():
    ctx = Context(
        grade=5,
        school_location=SCHOOL,
        dismissal=CTX.dismissal,
        existing=(Event(MON, hm("15:30"), hm("16:00"), "치과"),),
    )
    found = validate((PROGRAMS[0],), ctx, budget_cap=10**7)
    assert [(v.program_id, v.kind) for v in found] == [("p-a-eng", TIME_OVERLAP)]


def test_no_dismissal_day_skips_first_class_rules():
    weekend = prog("p-sat", "가온영어", "영어", (5,), "09:00", "10:00", 100_000, loc=FAR)
    assert validate((weekend,), CTX, budget_cap=10**7) == []


@pytest.mark.parametrize("order", [PROGRAMS, tuple(reversed(PROGRAMS))])
def test_recommend_order_is_deterministic(order):
    rows = recommend(order, CTX, BASE)
    assert [r.program.id for r in rows] == ["p-a-eng", "p-b-math", "p-d-math", "p-c-eng"]
    assert all(r.program.subject in ("영어", "수학") for r in rows)
