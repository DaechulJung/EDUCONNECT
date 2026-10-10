import type { Plan, PlanItem, Violation } from './client'
import { DAY_OPTIONS, formatWon } from './conditions'

export const NO_PLAN = '조건을 만족하는 일정이 없습니다'

// Server relaxation names (engine RELAX_*) → what the parent can change (experience 조건 불만족).
const RELAXATIONS: Record<string, string> = {
  budget: '예산 올리기',
  days: '요일 늘리기',
  subjects: '과목 줄이기',
}

export function relaxationLabels(names: readonly string[]): string[] {
  return names.map((n) => RELAXATIONS[n] ?? n)
}

export type DayEntry =
  | { kind: 'school'; end: string }
  | { kind: 'class'; item: PlanItem; violations: string[] }

const VIOLATIONS: Record<Violation['kind'], string> = {
  time_overlap: '시간 중복',
  travel_short: '이동 부족',
  over_budget: '예산 초과',
}

// One column per day, Monday first: the school block (dismissal from the plan's snapshot) then classes by start.
// Order and judgement are the server's; the screen only groups what the plan holds.
export function weekColumns(plan: Plan): { day: string; label: string; entries: DayEntry[] }[] {
  return DAY_OPTIONS.map(({ value, label }) => {
    const classes = plan.items
      .filter((i) => i.days.includes(value as PlanItem['days'][number]))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((item): DayEntry => ({
        kind: 'class',
        item,
        violations: plan.violations
          .filter((v) => v.program_id === item.program_id && v.kind !== 'over_budget')
          .map((v) => VIOLATIONS[v.kind]),
      }))
    const end = plan.school[value]
    return { day: value, label, entries: end ? [{ kind: 'school', end }, ...classes] : classes }
  })
}

export function itemMonthly(i: Pick<PlanItem, 'monthly_tuition' | 'monthly_other'>): number {
  return i.monthly_tuition + i.monthly_other
}

export function overBudget(plan: Pick<Plan, 'monthly_total' | 'budget_cap'>): string | null {
  const over = plan.monthly_total - plan.budget_cap
  return over > 0 ? `예산 초과 ${formatWon(over)}` : null
}
