import { readFileSync } from 'node:fs'
import { expect, type App, type Screen } from 'e2e'
import { beforeEach, test } from '@e2e-dev/web'
import { resetSeed, signInParent } from './chat-support'

// REQ-09 on the screens: TC-50~56 (AC-09.1~09.7). Every TC starts from the seed; the confirmed plan comes from
// saved conditions through the product API (POST draft → confirm), the organization change through the staff
// API or the staff screen, and what each side sees is read from the screen.
const BASE = { subjects: ['영어', '수학'], budget_target: 1_000_000, budget_cap: 1_100_000, types: [], days: [], density: 'tight' }

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

async function signIn(app: App, loginId: string): Promise<string> {
  const response = await fetch(new URL('/api/auth/login', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: loginId, password: process.env.SEED_PASSWORD }),
  })
  expect(response.status, `login ${loginId}`).toBe(200)
  return (response.headers.get('set-cookie') ?? '').split(';')[0]
}

async function call(app: App, cookie: string, method: string, path: string, body?: unknown) {
  const response = await fetch(new URL(path, app.baseUrl), {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  expect(response.status, `${method} ${path}`).toBe(200)
  return response.json()
}

type Item = { program_id: string; institution_name: string; subject: string; start: string; type: string }
type PlanBody = { id: string; status: string; monthly_total: number; budget_cap: number; items: Item[] }

// The seed parent's 초5 child with these conditions, drafted and confirmed.
async function confirmedPlan(app: App, conditions: Record<string, unknown>): Promise<{ parent: string; plan: PlanBody }> {
  const parent = await signIn(app, 'parent1')
  const [child] = await call(app, parent, 'GET', '/api/children')
  await call(app, parent, 'PUT', `/api/children/${child.id}/conditions`, conditions)
  const draft = await call(app, parent, 'POST', '/api/plans/draft', { child_id: child.id })
  const plan = (await call(app, parent, 'POST', `/api/plans/${draft.id}/confirm`)) as PlanBody
  expect(plan.status).toBe('confirmed')
  return { parent, plan }
}

type SeedAcademy = { key: string; name: string }
const academies = () => (JSON.parse(readFileSync(new URL('../apps/api/app/seed/data/academies.json', import.meta.url), 'utf8')) as { academies: SeedAcademy[] }).academies
const ACADEMY_A = () => academies().find((a) => a.key === 'academy-a')!.name

// Academy A's math class of the plan, as academy A's staff API returns it (for PUT bodies).
async function academyMath(app: App, plan: PlanBody) {
  const item = plan.items.find((i) => i.subject === '수학' && i.institution_name === ACADEMY_A())
  expect(item, '확정 계획의 학원 A 수학').toBeTruthy()
  const staff = await signIn(app, 'academy-a')
  const programs = (await call(app, staff, 'GET', '/api/academy/programs')) as ({ id: string; institution_id: string; monthly_tuition: number } & Record<string, unknown>)[]
  const program = programs.find((p) => p.id === item!.program_id)!
  const { id, institution_id: _institution, ...fields } = program
  return { staff, id, fields, program }
}

// AC-09.1's change: academy A math moves to 14:00~15:30, inside 초5 school hours (dismissal 14:40).
async function moveMathIntoSchoolHours(app: App, plan: PlanBody) {
  const math = await academyMath(app, plan)
  await call(app, math.staff, 'PUT', `/api/academy/programs/${math.id}`, { ...math.fields, start: '14:00', end: '15:30' })
}

async function openSchedule(app: App, screen: Screen) {
  await signInParent(app, screen)
  await app.open('/schedule')
  await expect(screen.getByRole('region', '확정 계획').first()).toBeVisible({ timeout: 15_000 })
}

const impactTag = (screen: Screen) => screen.getByLabel('영향 표시')

async function signInAcademy(app: App, screen: Screen) {
  await app.open('/login')
  await screen.getByLabel('아이디').fill('academy-a')
  await screen.getByLabel('비밀번호').fill(process.env.SEED_PASSWORD!)
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', '학원 프로그램 관리')).toBeVisible({ timeout: 10_000 })
}

test('TC-50 학원 A 담당자가 확정 계획의 수학 반을 학교 시간과 겹치게 저장하면 영향받는 계획 1건이 보인다', async ({ app, screen }) => {
  const { plan } = await confirmedPlan(app, BASE)
  const math = plan.items.find((i) => i.subject === '수학' && i.institution_name === ACADEMY_A())
  expect(math, '확정 계획의 학원 A 수학').toBeTruthy()

  await signInAcademy(app, screen)
  await screen.getByRole('button', `수학 화·금 ${math!.start} 수정`).tap()
  await screen.getByLabel('시작 시각').fill('14:00')
  await screen.getByLabel('종료 시각').fill('15:30')
  await screen.getByRole('button', '프로그램 저장').tap()

  await expect(screen.getByRole('status', '영향 결과')).toContainText('영향받는 계획 1건', { timeout: 15_000 })
})

test('TC-51 학원 변경 뒤 보호자 일정 탭의 그 계획에 영향 있음 · 시간 중복이 보인다', async ({ app, screen }) => {
  const { plan } = await confirmedPlan(app, BASE)
  await moveMathIntoSchoolHours(app, plan)

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 시간 중복', { timeout: 15_000 })
})

test('TC-52 월 학원비 1,050,000원 확정 계획의 교습비가 100,000원 오르면 영향 있음 · 예산 초과 50,000원이 보인다', async ({ app, screen }) => {
  // Precondition: the seed plan totals 990,000원; academy A math +60,000원 makes it 1,050,000원 before confirming.
  const parent = await signIn(app, 'parent1')
  const [child] = await call(app, parent, 'GET', '/api/children')
  await call(app, parent, 'PUT', `/api/children/${child.id}/conditions`, BASE)
  const first = (await call(app, parent, 'POST', '/api/plans/draft', { child_id: child.id })) as PlanBody
  const math = await academyMath(app, first)
  await call(app, math.staff, 'PUT', `/api/academy/programs/${math.id}`, { ...math.fields, monthly_tuition: math.program.monthly_tuition + (1_050_000 - first.monthly_total) })
  const { plan } = await confirmedPlan(app, BASE)
  expect([plan.monthly_total, plan.budget_cap]).toEqual([1_050_000, 1_100_000])
  expect(plan.items.map((i) => i.program_id)).toContain(math.id)

  const now = await academyMath(app, plan)
  await call(app, now.staff, 'PUT', `/api/academy/programs/${now.id}`, { ...now.fields, monthly_tuition: now.program.monthly_tuition + 100_000 })

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 예산 초과 50,000원', { timeout: 15_000 })
})

// '촘촘하게'(공백 30분 이하)면 시드에서 학원 A 15:00 반 말고는 후보가 없어 대안이 없다. 대안이 있는 조정은 '보통'으로 확정한다.
const NORMAL = { ...BASE, density: 'normal' }

test('TC-53 영향 있는 계획에서 조정안을 수락하면 위반 0건 대안이 확정 계획이 되고 영향 표시가 사라진다', async ({ app, screen }) => {
  const { parent, plan } = await confirmedPlan(app, NORMAL)
  await moveMathIntoSchoolHours(app, plan)

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 시간 중복', { timeout: 15_000 })
  await screen.getByRole('link', '조정안 보기').tap()
  const proposal = screen.getByRole('region', '대안 일정')
  await expect(proposal).toBeVisible({ timeout: 15_000 })
  await expect(proposal).toContainText('규칙 위반 0건')
  await expect(proposal.getByText('시간 중복')).toHaveCount(0)

  await screen.getByRole('button', '조정안 수락').tap()
  await expect(screen.getByRole('region', '대안 일정')).toHaveCount(0, { timeout: 15_000 })
  await expect(screen.getByRole('region', '확정 계획')).toHaveCount(1, { timeout: 15_000 })
  await expect(impactTag(screen)).toHaveCount(0)

  const plans = (await call(app, parent, 'GET', '/api/plans')) as (PlanBody & { impact: { affected: boolean } | null })[]
  const confirmed = plans.filter((p) => p.status === 'confirmed')
  expect(confirmed.length).toBe(1)
  expect(confirmed[0].id).not.toBe(plan.id)
  expect(confirmed[0].impact?.affected).toBe(false)
})

test('TC-54 영향 있는 계획에서 그대로 두기를 누르면 기존 확정 계획과 영향 표시가 남는다', async ({ app, screen }) => {
  const { parent, plan } = await confirmedPlan(app, NORMAL)
  await moveMathIntoSchoolHours(app, plan)

  await openSchedule(app, screen)
  await screen.getByRole('link', '조정안 보기').tap()
  await expect(screen.getByRole('region', '대안 일정')).toBeVisible({ timeout: 15_000 })
  await screen.getByRole('button', '그대로 두기').tap()

  await expect(screen.getByRole('region', '대안 일정')).toHaveCount(0, { timeout: 15_000 })
  await expect(impactTag(screen)).toHaveText('영향 있음 · 시간 중복', { timeout: 15_000 })
  const plans = (await call(app, parent, 'GET', '/api/plans')) as PlanBody[]
  expect(plans.filter((p) => p.status === 'confirmed').map((p) => p.id)).toEqual([plan.id])
})

test('TC-55 학교가 초5 수요일 하교를 수업과 겹치게 늦추면 영향 있음 · 시간 중복과 대안 없음·완화할 조건이 보인다', async ({ app, screen }) => {
  // 논술만 원하면 수요일 15:00 논술 하나로 확정된다(초5 수 하교 13:40). 15:30으로 늦추면 겹치고 다른 논술 반은 없다.
  const { plan } = await confirmedPlan(app, { ...NORMAL, subjects: ['논술'] })
  expect(plan.items.map((i) => i.subject)).toEqual(['논술'])
  const school = await signIn(app, 'school-elem')
  await call(app, school, 'PUT', '/api/school/timetable', { entries: [{ grade: 5, dow: 'wed', dismissal: '15:30' }] })

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 시간 중복', { timeout: 15_000 })
  await screen.getByRole('link', '조정안 보기').tap()
  await expect(screen.getByText('조건을 만족하는 대안이 없습니다')).toBeVisible({ timeout: 15_000 })
  const relax = await screen.getByRole('list', '완화할 조건').getByRole('listitem').allTextContents()
  expect(relax.length).toBeGreaterThan(0)
  for (const r of relax) expect(['예산 올리기', '요일 늘리기', '과목 줄이기']).toContain(r.trim())
})

test('TC-56 학원 A 담당자의 영향 확인 화면과 영향 조회 API에는 계획 수만 있다', async ({ app, screen }) => {
  const { plan } = await confirmedPlan(app, BASE)
  await moveMathIntoSchoolHours(app, plan)
  const [child] = await call(app, await signIn(app, 'parent1'), 'GET', '/api/children')

  await signInAcademy(app, screen)
  await app.open('/impact')
  await expect(screen.getByRole('region', '영향 요약')).toContainText('영향받는 계획 1건', { timeout: 15_000 })
  const page = (await screen.getByRole('main').textContent()) ?? ''
  for (const leaked of [child.alias, `초${child.grade}`, 'parent1', plan.id]) expect(page).not.toContain(leaked)

  const body = await call(app, await signIn(app, 'academy-a'), 'GET', '/api/org/impact')
  expect(Object.keys(body).sort()).toEqual(['affected_plans', 'items'])
  expect(body.affected_plans).toBe(1)
  for (const item of body.items) expect(Object.keys(item).sort()).toEqual(['affected_plans', 'grade', 'program_id'])
  const text = JSON.stringify(body)
  for (const leaked of [child.alias, child.id, 'parent1', plan.id]) expect(text).not.toContain(leaked)
})

// PR #29 회귀 (VERIFIER 보류 13:29Z, 정대철_테스트 판단 13:24Z·13:28Z). Each case was RED on de31198.

// Codex P2 1 (experience 78·181행): after the school moves 초5 Wednesday dismissal to 15:30 (TC-55's change), the
// adjustment screen's confirmed plan shows today's school time, not the 13:40 it was confirmed with.
test('#9 회귀 하교 시각이 바뀐 뒤 조정안 화면의 기존 계획 학교 칸은 지금 하교 시각이다', async ({ app, screen }) => {
  await confirmedPlan(app, { ...NORMAL, subjects: ['논술'] })
  const school = await signIn(app, 'school-elem')
  await call(app, school, 'PUT', '/api/school/timetable', { entries: [{ grade: 5, dow: 'wed', dismissal: '15:30' }] })

  await openSchedule(app, screen)
  await screen.getByRole('link', '조정안 보기').tap()
  const current = screen.getByRole('region', '기존 계획')
  await expect(current).toBeVisible({ timeout: 15_000 })
  await expect(current.getByRole('listitem', '수 학교')).toHaveText(/~15:30/)
})

// Codex P2 3 (experience 37·90행, FLOW-02 2단계 "또는 학교 담당자"): the school's timetable save shows the result line.
test('#9 회귀 학교 담당자가 초5 수요일 하교를 수업과 겹치게 늦춰 저장하면 결과 줄에 영향받는 계획 1건이 보인다', async ({ app, screen, browser }) => {
  await confirmedPlan(app, { ...NORMAL, subjects: ['논술'] })
  await browser.setViewport({ width: 1280, height: 800 }) // organization width (prd 4.2)
  await app.open('/login')
  await screen.getByLabel('아이디').fill('school-elem')
  await screen.getByLabel('비밀번호').fill(process.env.SEED_PASSWORD!)
  await screen.getByRole('button', '로그인').tap()
  await screen.getByRole('tab', '5학년').tap()
  await screen.getByLabel('5학년 수요일 하교 시각').fill('15:30')
  await screen.getByRole('button', '시간표 저장').tap()
  await expect(screen.getByRole('status', '영향 결과')).toContainText('영향받는 계획 1건', { timeout: 15_000 })
})

// a (PRD 196·252행, experience 82·185행): deleting a program a confirmed plan uses is '영향 있음 · 내용 변경' for the
// parent and one affected plan for the academy.
test('#9 회귀 확정 계획의 프로그램을 학원이 삭제하면 보호자에게 영향 있음 · 내용 변경, 학원에 영향받는 계획 1건이 보인다', async ({ app, screen }) => {
  const { plan } = await confirmedPlan(app, BASE)
  const math = await academyMath(app, plan)
  const response = await fetch(new URL(`/api/academy/programs/${math.id}`, app.baseUrl), { method: 'DELETE', headers: { cookie: math.staff } })
  expect(response.ok, 'DELETE program').toBe(true)

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 내용 변경', { timeout: 15_000 })

  await app.clearState()
  await signInAcademy(app, screen)
  await app.open('/impact')
  await expect(screen.getByRole('region', '영향 요약')).toContainText('영향받는 계획 1건', { timeout: 15_000 })
})

test('#9 회귀 확정 계획의 수업 시각만 바뀌고 위반이 없으면 영향 있음 · 내용 변경이 보인다', async ({ app, screen }) => {
  const { plan } = await confirmedPlan(app, BASE)
  const math = await academyMath(app, plan)
  await call(app, math.staff, 'PUT', `/api/academy/programs/${math.id}`, { ...math.fields, start: '15:10', end: '16:40' })

  await openSchedule(app, screen)
  await expect(impactTag(screen)).toHaveText('영향 있음 · 내용 변경', { timeout: 15_000 })
})

// b (experience 83행): in the alternative, the classes that differ from the confirmed plan are bold, the rest are not.
test('#9 회귀 조정안 대안에서 기존 계획과 바뀐 칸만 굵게 보인다', async ({ app, screen, browser }) => {
  const { plan } = await confirmedPlan(app, NORMAL)
  await moveMathIntoSchoolHours(app, plan)

  await openSchedule(app, screen)
  await screen.getByRole('link', '조정안 보기').tap()
  await expect(screen.getByRole('region', '대안 일정')).toBeVisible({ timeout: 15_000 })
  const weights = await browser.evaluate((before: string[]) => {
    const region = document.querySelector('[aria-label="대안 일정"]')!
    return Array.from(region.querySelectorAll('li[aria-label$="수업"]'))
      .filter((li) => li.getClientRects().length > 0)
      .map((li) => {
        const text = li.textContent ?? ''
        return { text, kept: before.some((b) => text.includes(b)), weight: Number(getComputedStyle(li.querySelector('span:nth-child(2)')!).fontWeight) }
      })
  }, plan.items.filter((i) => i.subject !== '수학').map((i) => `${i.institution_name}${i.start}`))
  expect(weights.some((w) => !w.kept), `alternative classes ${JSON.stringify(weights)}`).toBe(true)
  for (const w of weights) expect(w.weight >= 600, `${w.text} weight ${w.weight}`).toBe(!w.kept)
})
