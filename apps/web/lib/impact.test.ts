import { expect, test } from 'vitest'
import type { Plan, PlanItem } from './client'
import { IMPACT_NONE, affectedLabel, impactLabel, proposalPlan } from './impact'

test('영향 태그는 위반 사유를 가운뎃점으로 잇고 예산 초과는 금액을 붙인다 (AC-09.2·09.3)', () => {
  expect(impactLabel({ affected: true, reasons: [{ kind: 'time_overlap', program_id: 'p1' }] })).toBe('영향 있음 · 시간 중복')
  expect(impactLabel({ affected: true, reasons: [{ kind: 'over_budget', program_id: null, amount: 50_000 }] })).toBe('영향 있음 · 예산 초과 50,000원')
  expect(
    impactLabel({
      affected: true,
      reasons: [
        { kind: 'time_overlap', program_id: 'p1' },
        { kind: 'time_overlap', program_id: 'p2' },
        { kind: 'travel_short', program_id: 'p2' },
      ],
    }),
  ).toBe('영향 있음 · 시간 중복 · 이동 부족')
})

test('위반 없는 내용 변경은 영향 있음이 아니고, 영향이 없으면 태그가 없다 (AD-4)', () => {
  expect(impactLabel({ affected: false, reasons: [{ kind: 'content_changed', program_id: 'p1' }] })).toBeNull()
  expect(impactLabel({ affected: false, reasons: [] })).toBeNull()
  expect(impactLabel(null)).toBeNull()
  expect(impactLabel(undefined)).toBeNull()
})

test('기관 영향 문구는 계획 수만 보인다 (AC-09.1·09.7)', () => {
  expect(affectedLabel(1)).toBe('영향받는 계획 1건')
  expect(affectedLabel(0)).toBe(IMPACT_NONE)
})

test('조정안은 기존 계획의 학교 시간·상한에 대안 항목과 합계를 얹은 위반 0건 계획이다 (AC-09.4)', () => {
  const item: PlanItem = { program_id: 'p9', institution_name: '다온수학학원', subject: '수학', type: 'academy', days: ['mon'], start: '16:30', end: '17:50', monthly_tuition: 380_000, monthly_other: 20_000 }
  const plan = { id: 'x', child_id: 'c', status: 'confirmed', items: [], school: { mon: '14:40' }, budget_cap: 1_100_000, monthly_total: 1, violations: [], created_at: 't' } as Plan
  const p = proposalPlan(plan, { plan_id: 'x', reasons: [], proposal: [item], monthly_total: 400_000, violations: [] })
  expect(p).toMatchObject({ status: 'confirmed', items: [item], school: { mon: '14:40' }, budget_cap: 1_100_000, monthly_total: 400_000, violations: [] })
  expect(p.impact).toBeNull()
})
