import type { Adjustment, ImpactReasonItem, Plan, PlanImpact } from './client'
import { formatWon } from './conditions'

export const IMPACT_NONE = '영향받는 계획이 없어요'
export const NO_ALTERNATIVE = '조건을 만족하는 대안이 없습니다'

const REASONS: Record<Exclude<ImpactReasonItem['kind'], 'content_changed'>, string> = {
  time_overlap: '시간 중복',
  travel_short: '이동 부족',
  over_budget: '예산 초과',
}

// 영향 태그 (experience): only a plan the server judged affected gets one; reasons joined by '·', each kind once,
// the overage with its amount. A change without a violation (content_changed) is not '영향 있음' (AD-4).
export function impactLabel(impact: PlanImpact | null | undefined): string | null {
  if (!impact?.affected) return null
  const parts: string[] = []
  for (const r of impact.reasons) {
    if (r.kind === 'content_changed') continue
    const text = r.kind === 'over_budget' && r.amount ? `${REASONS.over_budget} ${formatWon(r.amount)}` : REASONS[r.kind]
    if (!parts.includes(text)) parts.push(text)
  }
  return ['영향 있음', ...parts].join(' · ')
}

// Organization screens see counts only (AC-09.7).
export function affectedLabel(count: number): string {
  return count > 0 ? `영향받는 계획 ${count}건` : IMPACT_NONE
}

// The proposal shown like a plan: the confirmed plan's school times and cap with the alternative's items and total.
export function proposalPlan(plan: Plan, adjustment: Adjustment): Plan {
  return { ...plan, items: adjustment.proposal, monthly_total: adjustment.monthly_total, violations: adjustment.violations, impact: null }
}
