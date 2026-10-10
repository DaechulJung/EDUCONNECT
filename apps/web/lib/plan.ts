import type { Plan, PlanItem, Violation } from './client'
import { DAY_OPTIONS, formatWon } from './conditions'

export const NO_PLAN = '조건을 만족하는 일정이 없습니다'
export const BLOCKED = '겹치는 수업이 있어요. 바꾸거나 빼 주세요'
export const UNAVAILABLE = '신청할 수 없게 된 수업이 있어요. 바꾸거나 빼 주세요'
export const UNAVAILABLE_TAG = '신청 불가'
export const OVER_BUDGET = '예산을 넘었어요. 바꾸거나 빼 주세요'

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
// `unavailable`: program ids the server refused as unknown_program (deleted, full, unpublished, other grade).
export function weekColumns(plan: Plan, unavailable: readonly string[] = []): { day: string; label: string; entries: DayEntry[] }[] {
  return DAY_OPTIONS.map(({ value, label }) => {
    const classes = plan.items
      .filter((i) => i.days.includes(value as PlanItem['days'][number]))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((item): DayEntry => ({
        kind: 'class',
        item,
        violations: [
          ...plan.violations
            .filter((v) => v.program_id === item.program_id && v.kind !== 'over_budget')
            .map((v) => VIOLATIONS[v.kind]),
          ...(unavailable.includes(item.program_id) ? [UNAVAILABLE_TAG] : []),
        ],
      }))
    const end = plan.school[value]
    return { day: value, label, entries: end ? [{ kind: 'school', end }, ...classes] : classes }
  })
}

export function itemMonthly(i: Pick<PlanItem, 'monthly_tuition' | 'monthly_other'>): number {
  return i.monthly_tuition + i.monthly_other
}

// The server's over_budget amount (current total − cap) wins: after a 409 the plan's totals are the old snapshot.
export function overBudget(plan: Pick<Plan, 'monthly_total' | 'budget_cap' | 'violations'>): string | null {
  const over = plan.violations.find((v) => v.kind === 'over_budget')?.amount ?? plan.monthly_total - plan.budget_cap
  return over > 0 ? `예산 초과 ${formatWon(over)}` : null
}

// '일정 확정' only for a draft the server judged clean (time overlap, travel shortage and over-budget all block)
// and with no program the server refused on the last confirm or edit.
export function canConfirm(plan: Pick<Plan, 'status' | 'violations'>, unavailable: readonly string[] = []): boolean {
  return plan.status === 'draft' && plan.violations.length === 0 && unavailable.length === 0
}

// Notice under '일정 확정' when it is disabled, by what blocks it: refused programs, then cell violations, then budget only.
export function confirmNotice(plan: Pick<Plan, 'status' | 'violations'>, unavailable: readonly string[] = []): string | null {
  if (plan.status !== 'draft' || canConfirm(plan, unavailable)) return null
  if (unavailable.length) return UNAVAILABLE
  return plan.violations.some((v) => v.kind !== 'over_budget') ? BLOCKED : OVER_BUDGET
}

export type ErrorBody = { detail?: string; data?: { violations?: Plan['violations']; program_ids?: string[] } } | undefined

// A failed confirm (or edit) the screen can show in place: 409 violations redraws the draft with the server's
// current violations; 422 unknown_program marks the refused programs. Anything else is a plain error (null).
export function confirmFailure(plan: Plan, status: number | undefined, body: ErrorBody): { plan: Plan; unavailable: string[] } | null {
  if (status === 409 && body?.detail === 'violations') return { plan: { ...plan, violations: body.data?.violations ?? [] }, unavailable: [] }
  if (status === 422 && body?.detail === 'unknown_program') return { plan, unavailable: body.data?.program_ids ?? [] }
  return null
}

// Program ids after removing or swapping one item; order is kept so the server sees the same list shape.
export function withoutProgram(plan: Pick<Plan, 'items'>, programId: string): string[] {
  return plan.items.map((i) => i.program_id).filter((id) => id !== programId)
}

export function swapProgram(plan: Pick<Plan, 'items'>, from: string, to: string): string[] {
  return plan.items.map((i) => (i.program_id === from ? to : i.program_id))
}

// '바꾸기' candidates: recommended programs of the same subject that the draft does not hold yet.
export function swapCandidates<T extends { program_id: string; subject: string }>(plan: Pick<Plan, 'items'>, item: Pick<PlanItem, 'subject'>, recs: readonly T[]): T[] {
  const held = new Set(plan.items.map((i) => i.program_id))
  return recs.filter((r) => r.subject === item.subject && !held.has(r.program_id))
}
