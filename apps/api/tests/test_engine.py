"""엔진 시험 (TC-41·42·43·44·46·78).

앞부분은 기준 시나리오 모양의 고정 입력으로 엔진 순수 함수를 본다. 뒷부분은 시드를 적재하고
`POST /api/plans/draft`로 기준 시나리오 일정을 만든 뒤, 시드 JSON의 좌표·하교 시각으로 겹침·공백을
다시 계산해 판정한다(결과 프로그램은 고정하지 않음).
"""

import math

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.units import hhmm_to_min, min_to_hhmm
from app.core.vocab import DOW_CODES as DOWS
from app.main import create_app
from app.seed import load
from app.services.planner.engine import (
    OVER_BUDGET,
    RELAX_BUDGET,
    RELAX_SUBJECTS,
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
from tests.conftest import login

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


def test_plan_without_a_requested_subject_is_not_feasible():
    # 상한 안에서 영어만 넣을 수 있으면 해가 없다(AC-07.5). 과목을 빼면 해가 생긴다.
    cheap_english = prog("p-cheap", "가온영어", "영어", (WED,), "15:00", "15:40", 30_000)
    cond = Conditions(subjects=("영어", "수학"), budget_target=100_000, budget_cap=100_000)
    result = generate((*PROGRAMS, cheap_english), CTX, cond)
    assert isinstance(result, NoFeasiblePlan)
    assert RELAX_SUBJECTS in result.relaxations


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


# ---- 시드 기준 시나리오 (POST /api/plans/draft) ----

CHILD = str(load.seed_id("child-elem5"))
BASE_CONDITIONS = {  # 기준 시나리오: 초5, 영어·수학, 목표 1,000,000·상한 1,100,000, 촘촘하게
    "subjects": ["영어", "수학"],
    "budget_target": 1_000_000,
    "budget_cap": 1_100_000,
    "types": [],
    "days": [],
    "density": "tight",
}


def seed_places() -> tuple[tuple[float, float], dict[str, tuple[str, tuple[float, float]]]]:
    """School location of 하늘 and, per seed program id, (owner login_id, location)."""
    school = next(s for s in load.read("schools")["schools"] if s["key"] == "school-elem")
    school_at = (school["lat"], school["lng"])
    places = {
        str(load.seed_id(p["key"])): ("school-elem", school_at) for p in school["after_school"]
    }
    for academy in load.read("academies")["academies"]:
        at = (academy["lat"], academy["lng"])
        for p in academy["programs"]:
            places[str(load.seed_id(p["key"]))] = (academy["key"], at)
    return school_at, places


SCHOOL_AT, PLACES = seed_places()
EXISTING = [  # 하늘의 기존 일정 (시드)
    (e["dow"], hhmm_to_min(e["start"]), hhmm_to_min(e["end"]))
    for c in load.read("children")["children"]
    if c["key"] == "child-elem5"
    for e in c["child"]["existing_events"]
]


@pytest.fixture(scope="module")
def seeded() -> TestClient:
    with TestClient(create_app(Settings(enable_test_routes=True))) as client:
        yield client


@pytest.fixture
def parent(seeded: TestClient) -> TestClient:
    assert seeded.post("/api/test/reset").json() == {"reset": True}
    assert login(seeded, "parent1").status_code == 200
    put = seeded.put(f"/api/children/{CHILD}/conditions", json=BASE_CONDITIONS)
    assert put.status_code == 200
    return seeded


def draft(client: TestClient) -> dict:
    response = client.post("/api/plans/draft", json={"child_id": CHILD})
    assert response.status_code == 200, response.text
    plan = response.json()
    assert plan["items"], "기준 시나리오에서 일정이 비어 있다"
    return plan


def slots(plan: dict) -> list[tuple[str, int, int, str]]:
    """(dow, start, end, program_id) for every class in the plan."""
    return [
        (dow, hhmm_to_min(i["start"]), hhmm_to_min(i["end"]), i["program_id"])
        for i in plan["items"]
        for dow in i["days"]
    ]


def day_gaps_from(plan: dict) -> dict[str, list[int]]:
    """Gap per step (school → first class, class → class) recomputed from seed coordinates."""
    gaps: dict[str, list[int]] = {}
    for dow in DOWS:
        day = sorted((s, e, pid) for d, s, e, pid in slots(plan) if d == dow)
        if not day:
            continue
        dismissal = plan["school"].get(dow)
        prev_end = hhmm_to_min(dismissal) if dismissal else None
        prev_at = SCHOOL_AT if dismissal else None
        for start, end, pid in day:
            at = PLACES[pid][1]
            if prev_end is not None:
                gaps.setdefault(dow, []).append(start - prev_end - travel_minutes(prev_at, at))
            prev_end, prev_at = end, at
    return gaps


def same_schedule(plan: dict) -> list[tuple]:
    return sorted((i["program_id"], tuple(i["days"]), i["start"], i["end"]) for i in plan["items"])


def test_tc41_seed_week_has_school_and_classes_without_overlap(parent):
    plan = draft(parent)
    assert plan["status"] == "draft" and plan["violations"] == []
    assert set(plan["school"]) >= {"mon", "tue", "wed", "thu", "fri"}
    busy = slots(plan) + [(d, s, e, "existing") for d, s, e in EXISTING]
    for dow, start, _end, _pid in slots(plan):  # 학교 시간(하교 전)과 겹치지 않는다
        dismissal = plan["school"].get(dow)
        assert dismissal is None or start >= hhmm_to_min(dismissal)
    pairs = [
        (a, b)
        for n, a in enumerate(busy)
        for b in busy[n + 1 :]
        if a[0] == b[0] and a[1] < b[2] and b[1] < a[2]
    ]
    assert pairs == []


def test_tc42_seed_no_travel_shortage(parent):
    gaps = day_gaps_from(draft(parent))
    assert gaps and all(g >= 0 for gs in gaps.values() for g in gs)


def test_tc43_seed_total_is_sum_of_costs_and_under_cap(parent):
    plan = draft(parent)
    expected = sum(i["monthly_tuition"] + i["monthly_other"] for i in plan["items"])
    assert plan["monthly_total"] == expected <= 1_100_000


def test_tc44_seed_success_criterion_3(parent):
    plan = draft(parent)
    assert 900_000 <= plan["monthly_total"] <= 1_100_000
    weekly: dict[str, int] = {}
    for i in plan["items"]:
        weekly[i["subject"]] = weekly.get(i["subject"], 0) + len(i["days"])
    assert weekly.get("영어", 0) >= 2 and weekly.get("수학", 0) >= 2
    assert all(g <= 30 for gs in day_gaps_from(plan).values() for g in gs)


def test_tc46_seed_same_conditions_same_plan(parent):
    assert same_schedule(draft(parent)) == same_schedule(draft(parent))


def seed_program(program_id: str) -> tuple[str, dict]:
    """(owner academy login_id, ProgramIn body) of a seed academy program."""
    for academy in load.read("academies")["academies"]:
        for p in academy["programs"]:
            if str(load.seed_id(p["key"])) == program_id:
                body = {k: v for k, v in p.items() if k != "key"}
                return academy["key"], {**body, "lat": academy["lat"], "lng": academy["lng"]}
    raise AssertionError(f"not a seed academy program: {program_id}")


def test_tc78_moving_a_chosen_program_changes_the_plan(parent):
    before = draft(parent)
    item = next(i for i in before["items"] if i["type"] != "after_school")  # 결과에서 고른다
    owner, body = seed_program(item["program_id"])
    body["start"] = min_to_hhmm(hhmm_to_min(body["start"]) + 60)
    body["end"] = min_to_hhmm(hhmm_to_min(body["end"]) + 60)
    assert login(parent, owner).status_code == 200
    put = parent.put(f"/api/academy/programs/{item['program_id']}", json=body)
    assert put.status_code == 200, put.text

    assert login(parent, "parent1").status_code == 200
    after = draft(parent)
    assert same_schedule(after) != same_schedule(before)


def test_seed_no_feasible_plan_names_relaxations(parent):
    tight = {**BASE_CONDITIONS, "budget_target": 100_000, "budget_cap": 100_000}
    assert parent.put(f"/api/children/{CHILD}/conditions", json=tight).status_code == 200
    response = parent.post("/api/plans/draft", json={"child_id": CHILD})
    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "no_feasible_plan"
    assert set(body["data"]["relaxations"]) & {"budget", "days", "subjects"}
