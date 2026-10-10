import { expect, test } from 'vitest'
import type { Plan, PlanItem } from './client'
import { BLOCKED, OVER_BUDGET, UNAVAILABLE, UNAVAILABLE_TAG, canConfirm, confirmFailure, confirmNotice, itemBreakdown, itemMonthly, overBudget, planAnswer, relaxationLabels, swapCandidates, swapProgram, weekColumns, withoutProgram } from './plan'

const item = (over: Partial<PlanItem>): PlanItem => ({
  program_id: 'p1',
  institution_name: '새봄영어수학학원',
  subject: '영어',
  type: 'academy',
  days: ['mon', 'thu'],
  start: '15:00',
  end: '16:20',
  monthly_tuition: 450_000,
  monthly_other: 30_000,
  ...over,
})

const plan = (over: Partial<Plan> = {}): Plan => ({
  id: 'plan',
  child_id: 'c1',
  status: 'draft',
  items: [item({}), item({ program_id: 'p2', subject: '수학', days: ['mon'], start: '14:50', end: '15:00' })],
  school: { mon: '14:40', tue: '14:40' },
  budget_cap: 1_100_000,
  monthly_total: 990_000,
  violations: [],
  created_at: '2026-10-10T00:00:00Z',
  ...over,
})

test('주간 일정표는 월~일 7열이고 학교 시간 다음에 수업을 시작 시각 순으로 둔다 (AC-07.1)', () => {
  const cols = weekColumns(plan())
  expect(cols.map((c) => c.label)).toEqual(['월', '화', '수', '목', '금', '토', '일'])
  const mon = cols[0].entries
  expect(mon[0]).toEqual({ kind: 'school', end: '14:40' })
  expect(mon.slice(1).map((e) => (e.kind === 'class' ? e.item.program_id : ''))).toEqual(['p2', 'p1'])
  expect(cols[1].entries).toEqual([{ kind: 'school', end: '14:40' }])
  expect(cols[6].entries).toEqual([])
})

test('수업 칸에는 서버가 준 시간 중복·이동 부족만 붙고 예산 초과는 요약에 둔다', () => {
  const cols = weekColumns(plan({ violations: [{ program_id: 'p2', kind: 'time_overlap' }, { program_id: null, kind: 'over_budget', amount: 10 }] }))
  const classes = cols[0].entries.filter((e) => e.kind === 'class')
  expect(classes.map((e) => (e.kind === 'class' ? e.violations : []))).toEqual([['시간 중복'], []])
})

test('월 학원비는 교습비+기타경비이고 상한을 넘을 때만 초과 금액을 보인다 (AC-07.3)', () => {
  expect(itemMonthly(item({}))).toBe(480_000)
  expect(overBudget(plan())).toBeNull()
  expect(overBudget(plan({ monthly_total: 1_150_000 }))).toBe('예산 초과 50,000원')
})

test('완화할 조건은 서버 이름을 보호자 문구로 바꾼다 (AC-07.5)', () => {
  expect(relaxationLabels(['budget', 'days', 'subjects'])).toEqual(['예산 올리기', '요일 늘리기', '과목 줄이기'])
})

test('위반이 하나라도 있거나 초안이 아니면 확정할 수 없다 (AC-08.2)', () => {
  expect(canConfirm(plan())).toBe(true)
  expect(canConfirm(plan({ violations: [{ program_id: 'p2', kind: 'time_overlap' }] }))).toBe(false)
  expect(canConfirm(plan({ violations: [{ program_id: null, kind: 'over_budget', amount: 1 }] }))).toBe(false)
  expect(canConfirm(plan({ status: 'confirmed' }))).toBe(false)
})

test('빼기·바꾸기는 나머지 순서를 지킨 프로그램 목록을 만든다 (AC-08.1·08.2)', () => {
  expect(withoutProgram(plan(), 'p1')).toEqual(['p2'])
  expect(swapProgram(plan(), 'p2', 'p9')).toEqual(['p1', 'p9'])
})

test('바꾸기 후보는 같은 과목이고 초안에 없는 추천만이다', () => {
  const recs = [
    { program_id: 'p1', subject: '영어' },
    { program_id: 'p3', subject: '영어' },
    { program_id: 'p4', subject: '수학' },
  ]
  expect(swapCandidates(plan(), { subject: '영어' }, recs).map((r) => r.program_id)).toEqual(['p3'])
})

test('확정 409 violations는 응답의 위반으로 초안을 갱신해 칸 태그를 붙이고 확정을 막는다 (PR #23 P2)', () => {
  const body = { detail: 'violations', data: { violations: [{ program_id: 'p2', kind: 'travel_short' as const }] } }
  const failure = confirmFailure(plan(), 409, body)
  expect(failure).not.toBeNull()
  expect(failure!.unavailable).toEqual([])
  expect(failure!.plan.violations).toEqual(body.data.violations)
  expect(canConfirm(failure!.plan, failure!.unavailable)).toBe(false)
  const mon = weekColumns(failure!.plan, failure!.unavailable)[0].entries.filter((e) => e.kind === 'class')
  expect(mon.map((e) => (e.kind === 'class' ? e.violations : []))).toEqual([['이동 부족'], []])
})

test('확정 422 unknown_program은 그 칸에 신청 불가를 붙이고 초안을 바꿀 때까지 확정을 막는다 (PR #23 P2)', () => {
  const failure = confirmFailure(plan(), 422, { detail: 'unknown_program', data: { program_ids: ['p1'] } })
  expect(failure).toEqual({ plan: plan(), unavailable: ['p1'] })
  expect(canConfirm(failure!.plan, failure!.unavailable)).toBe(false)
  expect(canConfirm(failure!.plan, [])).toBe(true)
  const mon = weekColumns(failure!.plan, failure!.unavailable)[0].entries.filter((e) => e.kind === 'class')
  expect(mon.map((e) => (e.kind === 'class' ? e.violations : []))).toEqual([[], [UNAVAILABLE_TAG]])
  expect(confirmFailure(plan(), 500, undefined)).toBeNull()
  expect(confirmFailure(plan(), 422, { detail: 'empty_plan' })).toBeNull()
})

test('확정 409 over_budget은 응답 amount로 예산 초과를 보이고 시간 중복 안내는 보이지 않는다 (PR #24 P2)', () => {
  const body = { detail: 'violations', data: { violations: [{ program_id: null, kind: 'over_budget' as const, amount: 10_000 }] } }
  const failure = confirmFailure(plan(), 409, body)!
  // 옛 초안의 monthly_total(990,000)·budget_cap(1,100,000)으로는 초과가 아니다. 서버의 현재 판정을 따른다.
  expect(overBudget(failure.plan)).toBe('예산 초과 10,000원')
  expect(canConfirm(failure.plan, failure.unavailable)).toBe(false)
  expect(confirmNotice(failure.plan, failure.unavailable)).toBe(OVER_BUDGET)
  expect(confirmNotice(failure.plan, failure.unavailable)).not.toBe(BLOCKED)
})

test('확정 버튼 아래 안내는 위반 종류를 따른다', () => {
  expect(confirmNotice(plan())).toBeNull()
  expect(confirmNotice(plan({ violations: [{ program_id: 'p2', kind: 'time_overlap' }, { program_id: null, kind: 'over_budget', amount: 1 }] }))).toBe(BLOCKED)
  expect(confirmNotice(plan({ violations: [{ program_id: 'p2', kind: 'travel_short' }] }))).toBe(BLOCKED)
  expect(confirmNotice(plan(), ['p1'])).toBe(UNAVAILABLE)
  expect(confirmNotice(plan({ status: 'confirmed' }))).toBeNull()
})

// #7 회귀 07-4 (prd 68행, experience 49행): 합계 옆 내역은 '교습비'와 '기타경비'를 나눠 이름을 붙인다.
test('프로그램별 내역은 교습비 · 기타경비 이름과 합을 보인다', () => {
  expect(itemBreakdown({ monthly_tuition: 200_000, monthly_other: 20_000 })).toBe('교습비 200,000원 + 기타경비 20,000원 = 220,000원')
})

// #7 회귀 07-5 (experience 63행): 일정을 만든 뒤 결과를 먼저 쓰는 챗봇 답변.
test('일정 답변은 과목별 곳 수와 월 학원비를 먼저, 이동 시간 이유를 뒤에 쓴다', () => {
  const item = (subject: string, program_id: string) => ({ program_id, subject }) as PlanItem
  const plan = { items: [item('영어', 'e1'), item('수학', 'm1'), item('영어', 'e2'), item('수학', 'm2')], monthly_total: 1_020_000 } as Plan
  expect(planAnswer(plan)).toBe('영어 2곳·수학 2곳으로 월 1,020,000원 일정을 만들었어요. 학교 하교 뒤 이동 시간을 넣었어요.')
})

