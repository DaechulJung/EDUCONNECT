"""영향 판정 순수 함수 시험 (AD-4, #9 사전 작업).

확정 스냅숏 항목을 현재 프로그램·현재 하교 시각으로 다시 놓고 스냅숏 상한으로 검증한다.
AC-09.x 화면·API 시험은 #2·#3·#8 병합 뒤 붙인다.
"""

from dataclasses import replace

from app.services.planner.engine import (
    OVER_BUDGET,
    TIME_OVERLAP,
    TRAVEL_SHORT,
    Context,
    Program,
    Violation,
)
from app.services.planner.impact import CONTENT_CHANGED, assess

SCHOOL = (37.5000, 127.0000)
NEAR = (37.5045, 127.0000)  # 약 0.5km
FAR = (37.5900, 127.0000)  # 약 10km
MON, WED = 0, 2


def hm(text: str) -> int:
    h, m = text.split(":")
    return int(h) * 60 + int(m)


def prog(pid, days, start, end, tuition, other=0, location=NEAR, subject="math") -> Program:
    return Program(
        id=pid,
        institution_name="학원 A",
        type="academy",
        subject=subject,
        days=tuple(days),
        start_min=hm(start),
        end_min=hm(end),
        monthly_tuition=tuition,
        monthly_other=other,
        grade_min=1,
        grade_max=6,
        capacity=10,
        enrolled=0,
        location=location,
    )


CTX = Context(grade=5, school_location=SCHOOL, dismissal={MON: hm("14:30"), WED: hm("14:30")})
MATH = prog("math", [MON], "16:00", "17:00", 500_000, 50_000)
ENG = prog("eng", [WED], "16:00", "17:30", 450_000, 50_000, subject="english")
ITEMS = [MATH.item(), ENG.item()]  # 월 1,050,000원
CAP = 1_100_000


def test_unchanged_plan_has_no_reasons() -> None:
    impact = assess(ITEMS, {"math": MATH, "eng": ENG}, CTX, CAP)
    assert impact.reasons == ()
    assert impact.affected is False


def test_program_moved_into_school_hours_is_time_overlap() -> None:  # AC-09.1·09.2 판정
    moved = replace(MATH, start_min=hm("13:00"), end_min=hm("14:00"))
    impact = assess(ITEMS, {"math": moved, "eng": ENG}, CTX, CAP)
    assert Violation("math", TIME_OVERLAP) in impact.reasons
    assert impact.affected is True


def test_tuition_raise_over_snapshot_cap_reports_excess() -> None:  # AC-09.3 판정
    raised = replace(MATH, monthly_tuition=600_000)
    impact = assess(ITEMS, {"math": raised, "eng": ENG}, CTX, CAP)
    assert impact.reasons == (Violation(None, OVER_BUDGET, 50_000),)
    assert impact.affected is True


def test_later_dismissal_overlapping_class_is_time_overlap() -> None:  # AC-09.6 판정
    later = replace(CTX, dismissal={MON: hm("14:30"), WED: hm("16:30")})
    impact = assess(ITEMS, {"math": MATH, "eng": ENG}, later, CAP)
    assert Violation("eng", TIME_OVERLAP) in impact.reasons
    assert impact.affected is True


def test_moved_far_away_without_time_is_travel_short() -> None:
    far = replace(MATH, start_min=hm("14:40"), end_min=hm("15:40"), location=FAR)
    impact = assess(ITEMS, {"math": far, "eng": ENG}, CTX, CAP)
    assert Violation("math", TRAVEL_SHORT) in impact.reasons
    assert impact.affected is True


def test_harmless_time_change_is_content_changed_only() -> None:
    later = replace(MATH, start_min=hm("16:30"), end_min=hm("17:30"))
    impact = assess(ITEMS, {"math": later, "eng": ENG}, CTX, CAP)
    assert impact.reasons == (Violation("math", CONTENT_CHANGED),)
    assert impact.affected is False


def test_deleted_program_is_content_changed_and_left_out() -> None:
    impact = assess(ITEMS, {"eng": ENG}, CTX, CAP)
    assert impact.reasons == (Violation("math", CONTENT_CHANGED),)
    assert impact.affected is False


def test_snapshot_cap_is_used_not_a_newer_cap() -> None:
    raised = replace(MATH, monthly_tuition=560_000)  # 합계 1,110,000원
    assert assess(ITEMS, {"math": raised, "eng": ENG}, CTX, CAP).affected is True
    assert assess(ITEMS, {"math": raised, "eng": ENG}, CTX, 1_200_000).affected is False
