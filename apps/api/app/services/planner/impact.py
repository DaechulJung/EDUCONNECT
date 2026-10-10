"""확정 계획 영향 판정 (AD-4). DB·네트워크·시계에 접근하지 않는 순수 함수만 둔다.

확정 스냅숏 항목을 현재 프로그램·현재 하교 시각으로 다시 놓고, 스냅숏 예산 상한으로 엔진 검증을
다시 실행한다. 위반 사유(시간 중복·이동 부족·예산 초과)가 하나라도 있으면 '영향 있음'이다.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from app.services.planner import engine

CONTENT_CHANGED = "content_changed"
_COMPARED = ("days", "start_min", "end_min", "monthly_tuition", "monthly_other")


@dataclass(frozen=True)
class Impact:
    reasons: tuple[engine.Violation, ...]

    @property
    def affected(self) -> bool:
        return any(r.kind != CONTENT_CHANGED for r in self.reasons)


def assess(
    items: Sequence[Mapping],
    current: Mapping[str, engine.Program],
    ctx: engine.Context,
    budget_cap: int,
) -> Impact:
    """items는 plans.items(AD-16), current는 삭제되지 않은 현재 프로그램(ID별).

    삭제된 프로그램은 빼고 놓은 뒤 `content_changed`로 남긴다. 시각·금액만 바뀐 프로그램은 위반이
    하나도 없을 때만 `content_changed`다(위반이 있으면 위반 사유가 그 변경을 설명한다).
    """
    programs = [current[i["program_id"]] for i in items if i["program_id"] in current]
    violations = engine.validate(programs, ctx, budget_cap)
    changed = [
        engine.Violation(i["program_id"], CONTENT_CHANGED)
        for i in items
        if i["program_id"] not in current
        or (not violations and _differs(i, current[i["program_id"]]))
    ]
    return Impact(tuple(violations) + tuple(changed))


def _differs(item: Mapping, program: engine.Program) -> bool:
    now = program.item()
    return any(item.get(k) != now[k] for k in _COMPARED)
