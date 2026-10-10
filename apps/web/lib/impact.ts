import type { Adjustment, ImpactReasonItem, Plan, PlanImpact, PlanItem } from './client'
import { formatWon } from './conditions'

export const IMPACT_NONE = '영향받는 계획이 없어요'
export const NO_ALTERNATIVE = '조건을 만족하는 대안이 없습니다'

const REASONS: Record<ImpactReasonItem['kind'], string> = {
  time_overlap: '시간 중복',
  travel_short: '이동 부족',
  over_budget: '예산 초과',
  content_changed: '내용 변경',
}

// 영향 태그 (experience 82행): only a plan the server judged affected gets one; reasons joined by '·', each kind
// once, the overage with its amount. A time·price change or a deleted program is '영향 있음 · 내용 변경'.
export function impactLabel(impact: PlanImpact | null | undefined): string | null {
  if (!impact?.affected) return null
  const parts: string[] = []
  for (const r of impact.reasons) {
    const text = r.kind === 'over_budget' && r.amount ? `${REASONS.over_budget} ${formatWon(r.amount)}` : REASONS[r.kind]
    if (!parts.includes(text)) parts.push(text)
  }
  return ['영향 있음', ...parts].join(' · ')
}

// Organization screens see counts only (AC-09.7).
export function affectedLabel(count: number): string {
  return count > 0 ? `영향받는 계획 ${count}건` : IMPACT_NONE
}

// The proposal shown like a plan: the confirmed plan's school times (today's dismissal, as the server returns a
// confirmed plan) and cap with the alternative's items and total.
export function proposalPlan(plan: Plan, adjustment: Adjustment): Plan {
  return { ...plan, items: adjustment.proposal, monthly_total: adjustment.monthly_total, violations: adjustment.violations, impact: null }
}

// 조정안 비교 (experience 83행): the alternative's classes that are not in the confirmed plan as they were (a new
// program, or the same program on other days or times). Those cells are bold.
export function changedItems(before: PlanItem[], after: PlanItem[]): string[] {
  const same = (a: PlanItem, b: PlanItem) => a.program_id === b.program_id && a.start === b.start && a.end === b.end && a.days.join() === b.days.join()
  return after.filter((a) => !before.some((b) => same(a, b))).map((a) => a.program_id)
}
