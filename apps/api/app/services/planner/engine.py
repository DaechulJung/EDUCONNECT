"""일정·추천 엔진 (AD-5). DB·네트워크·시계에 접근하지 않는 순수 함수만 둔다.

단위는 AD-6을 따른다: 시각은 자정부터의 분, 요일은 0=월~6=일, 금액은 원, 학년은 1~9.
"""

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from itertools import combinations

from app.services.planner.travel import Point, travel_minutes

ALL_DAYS = (0, 1, 2, 3, 4, 5, 6)
# 가능 요일을 비워 두면 월~금(experience 157행 기본값).
WEEKDAYS = (0, 1, 2, 3, 4)
TIGHT_GAP_MAX_MIN = 30
MIN_WEEKLY_PER_SUBJECT = 2
MAX_PLAN_PROGRAMS = 8
UNLIMITED_BUDGET = 10**12

TIME_OVERLAP = "time_overlap"
TRAVEL_SHORT = "travel_short"
OVER_BUDGET = "over_budget"

RELAX_BUDGET = "budget"
RELAX_DAYS = "days"
RELAX_SUBJECTS = "subjects"


@dataclass(frozen=True)
class Program:
    id: str
    institution_name: str
    type: str
    subject: str
    days: tuple[int, ...]
    start_min: int
    end_min: int
    monthly_tuition: int | None
    monthly_other: int
    grade_min: int
    grade_max: int
    capacity: int
    enrolled: int
    location: Point | None

    @property
    def monthly_cost(self) -> int:
        return (self.monthly_tuition or 0) + self.monthly_other

    def item(self) -> dict:
        """plans.items 한 칸(AD-16)."""
        return {
            "program_id": self.id,
            "days": list(self.days),
            "start_min": self.start_min,
            "end_min": self.end_min,
            "monthly_tuition": self.monthly_tuition,
            "monthly_other": self.monthly_other,
            "subject": self.subject,
        }


@dataclass(frozen=True)
class Event:
    """자녀 기존 일정. 장소가 없으면 시간 중복만 보고 이동 계산에서 뺀다(AD-7)."""

    dow: int
    start_min: int
    end_min: int
    label: str
    location: Point | None = None


@dataclass(frozen=True)
class Conditions:
    subjects: tuple[str, ...]
    budget_target: int
    budget_cap: int
    types: tuple[str, ...] = ()
    days: tuple[int, ...] = WEEKDAYS
    density: str = "normal"


@dataclass(frozen=True)
class Context:
    """자녀 한 명의 고정 입력. dismissal은 요일별 하교 시각(없는 요일은 빠짐)."""

    grade: int
    school_location: Point | None
    dismissal: Mapping[int, int] = field(default_factory=dict)
    existing: tuple[Event, ...] = ()


@dataclass(frozen=True)
class Violation:
    program_id: str | None
    kind: str
    amount: int | None = None


@dataclass(frozen=True)
class Plan:
    programs: tuple[Program, ...]
    monthly_total: int
    violations: tuple[Violation, ...]

    def items(self) -> list[dict]:
        return [p.item() for p in self.programs]


@dataclass(frozen=True)
class NoFeasiblePlan:
    relaxations: tuple[str, ...]


@dataclass(frozen=True)
class Recommendation:
    program: Program
    travel_min: int
    score: int


@dataclass(frozen=True)
class _Slot:
    start: int
    end: int
    location: Point | None
    program_id: str | None  # None = 학교·기존 일정
    in_travel_chain: bool
    is_school: bool = False


def monthly_total(programs: Iterable[Program]) -> int:
    """월 학원비 = 프로그램별 (월 교습비 + 월 기타경비)를 프로그램당 한 번 더한 합."""
    return sum(p.monthly_cost for p in programs)


def weekly_counts(programs: Iterable[Program]) -> dict[str, int]:
    """과목의 주 횟수 = 그 과목 프로그램들의 요일 수 합."""
    counts: dict[str, int] = {}
    for p in programs:
        counts[p.subject] = counts.get(p.subject, 0) + len(p.days)
    return counts


def eligible(programs: Iterable[Program], ctx: Context, cond: Conditions) -> list[Program]:
    """후보 필터: 학년·과목·유형·요일, 미공개(교습비 NULL)·마감(정원=현재 인원) 제외."""
    allowed_days = set(cond.days)
    out = [
        p
        for p in programs
        if p.monthly_tuition is not None
        and p.enrolled < p.capacity
        and p.grade_min <= ctx.grade <= p.grade_max
        and (not cond.subjects or p.subject in cond.subjects)
        and (not cond.types or p.type in cond.types)
        and set(p.days) <= allowed_days
    ]
    return sorted(out, key=_canonical)


def _canonical(p: Program) -> tuple:
    return (p.institution_name, p.start_min, p.id)


def _day_slots(programs: Sequence[Program], ctx: Context, dow: int) -> list[_Slot]:
    slots: list[_Slot] = []
    if dow in ctx.dismissal:
        slots.append(_Slot(0, ctx.dismissal[dow], ctx.school_location, None, True, True))
    for e in ctx.existing:
        if e.dow == dow:
            slots.append(_Slot(e.start_min, e.end_min, e.location, None, e.location is not None))
    for p in programs:
        if dow in p.days:
            slots.append(_Slot(p.start_min, p.end_min, p.location, p.id, True))
    return sorted(slots, key=lambda s: (s.start, s.end, s.program_id or ""))


def validate(programs: Sequence[Program], ctx: Context, budget_cap: int) -> list[Violation]:
    """하드 제약 판정: 시간 중복, 이동 부족(공백 < 0), 예산 상한 초과."""
    found: dict[tuple[str | None, str], Violation] = {}

    def add(v: Violation) -> None:
        found.setdefault((v.program_id, v.kind), v)

    for dow in ALL_DAYS:
        slots = _day_slots(programs, ctx, dow)
        for a, b in combinations(slots, 2):
            if a.start < b.end and b.start < a.end:
                for s in (a, b):
                    if s.program_id is not None:
                        add(Violation(s.program_id, TIME_OVERLAP))
        chain = [s for s in slots if s.in_travel_chain]
        for prev, nxt in zip(chain, chain[1:], strict=False):
            if prev.end > nxt.start:
                continue  # 중복은 위에서 잡는다
            if nxt.start - prev.end - travel_minutes(prev.location, nxt.location) < 0:
                target = nxt if nxt.program_id is not None else prev
                if target.program_id is not None:
                    add(Violation(target.program_id, TRAVEL_SHORT))
    total = monthly_total(programs)
    if total > budget_cap:
        add(Violation(None, OVER_BUDGET, total - budget_cap))
    return sorted(found.values(), key=lambda v: (v.kind, v.program_id or ""))


def day_gaps(programs: Sequence[Program], ctx: Context) -> dict[int, list[int]]:
    """수업이 있는 요일마다 공백(다음 시작 − 이전 종료 − 이동시간) 목록.

    하교 시각이 있는 요일은 하교→첫 수업 공백을 포함한다.
    """
    gaps: dict[int, list[int]] = {}
    for dow in ALL_DAYS:
        chain = [
            s for s in _day_slots(programs, ctx, dow) if s.program_id is not None or s.is_school
        ]
        if not any(s.program_id for s in chain):
            continue
        gaps[dow] = [
            nxt.start - prev.end - travel_minutes(prev.location, nxt.location)
            for prev, nxt in zip(chain, chain[1:], strict=False)
        ]
    return gaps


def _covers_subjects(programs: Sequence[Program], cond: Conditions) -> bool:
    """요청한 과목이 모두 한 번 이상 들어 있어야 해다. 주 횟수는 목표(`_objective`)로 본다."""
    return {p.subject for p in programs} >= set(cond.subjects)


def _dense_enough(programs: Sequence[Program], ctx: Context, cond: Conditions) -> bool:
    if cond.density != "tight":
        return True
    return all(g <= TIGHT_GAP_MAX_MIN for gs in day_gaps(programs, ctx).values() for g in gs)


def _objective(programs: Sequence[Program], ctx: Context, cond: Conditions) -> tuple:
    counts = weekly_counts(programs)
    subjects_met = sum(1 for s in cond.subjects if counts.get(s, 0) >= MIN_WEEKLY_PER_SUBJECT)
    gap_sum = sum(sum(gs) for gs in day_gaps(programs, ctx).values())
    return (
        -subjects_met,
        abs(monthly_total(programs) - cond.budget_target),
        gap_sum,
        tuple(p.id for p in programs),
    )


def _search(candidates: Sequence[Program], ctx: Context, cond: Conditions) -> Plan | None:
    best: tuple | None = None
    best_set: tuple[Program, ...] = ()
    for size in range(1, min(MAX_PLAN_PROGRAMS, len(candidates)) + 1):
        for combo in combinations(candidates, size):
            if monthly_total(combo) > cond.budget_cap:
                continue
            if not _covers_subjects(combo, cond):
                continue
            if validate(combo, ctx, cond.budget_cap):
                continue
            if not _dense_enough(combo, ctx, cond):
                continue
            key = _objective(combo, ctx, cond)
            if best is None or key < best:
                best, best_set = key, combo
    if best is None:
        return None
    return Plan(best_set, monthly_total(best_set), ())


def generate(programs: Iterable[Program], ctx: Context, cond: Conditions) -> Plan | NoFeasiblePlan:
    """조건을 만족하는 주간 일정 하나를 결정형으로 고른다. 없으면 완화할 조건을 돌려준다."""
    programs = tuple(programs)
    plan = _search(eligible(programs, ctx, cond), ctx, cond)
    if plan is not None:
        return plan
    relaxed = {
        RELAX_BUDGET: Conditions(
            cond.subjects,
            cond.budget_target,
            UNLIMITED_BUDGET,
            cond.types,
            cond.days,
            cond.density,
        ),
        RELAX_DAYS: Conditions(
            cond.subjects,
            cond.budget_target,
            cond.budget_cap,
            cond.types,
            ALL_DAYS,
            cond.density,
        ),
        RELAX_SUBJECTS: Conditions(
            (), cond.budget_target, cond.budget_cap, cond.types, cond.days, cond.density
        ),
    }
    helps = tuple(
        name
        for name, c in relaxed.items()
        if _search(eligible(programs, ctx, c), ctx, c) is not None
    )
    return NoFeasiblePlan(helps or tuple(relaxed))


def recommend(programs: Iterable[Program], ctx: Context, cond: Conditions) -> list[Recommendation]:
    """비교표 행. 점수는 학교에서 가까울수록 높고, 정렬 키는 (점수, 학원명, 시작 시각, ID)."""
    rows = []
    for p in eligible(programs, ctx, cond):
        t = travel_minutes(ctx.school_location, p.location)
        rows.append(Recommendation(p, t, max(0, 100 - t)))
    return sorted(
        rows,
        key=lambda r: (-r.score, r.program.institution_name, r.program.start_min, r.program.id),
    )
