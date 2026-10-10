import { beforeEach, expect, test, type App, type Locator, type Screen } from 'e2e'
import { api, send, signInParent, TASK } from './chat-support'
import { AROUND_REPLY, makePlan, minutes, saveConditions, week } from './plan-support'

// REQ-03 in the browser (FLOW-03): TC-19 (AC-03.1), TC-20 (AC-03.2), TC-21 (AC-03.3), TC-22 (AC-03.4).
// The app must run with ENABLE_TEST_ROUTES=1, LLM_PROVIDER=fake and the seed password in SEED_PASSWORD.

const OVERLAP = '시간이 겹칩니다'

async function resetSeed(app: App) {
  const response = await fetch(new URL('/api/test/reset', app.baseUrl), { method: 'POST' })
  expect(response.status).toBe(200)
}

function seedPassword(): string {
  const password = process.env.SEED_PASSWORD
  expect(password, 'SEED_PASSWORD').toBeTruthy()
  return password!
}

async function signInSchool(app: App, screen: Screen) {
  await app.open('/login')
  await screen.getByLabel('아이디').fill('school-elem')
  await screen.getByLabel('비밀번호').fill(seedPassword())
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', '학교 시간표 관리')).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByRole('tab', '5학년')).toBeVisible({ timeout: 10_000 })
}

async function saveWednesday(screen: Screen, value: string) {
  await screen.getByRole('tab', '5학년').tap()
  await screen.getByLabel('5학년 수요일 하교 시각').fill(value)
  await screen.getByRole('button', '시간표 저장').tap()
  await expect(screen.getByText('시간표를 저장했어요')).toBeVisible({ timeout: 10_000 })
}

// AC-03.3 values (experience FLOW-03). Grades 3~6 so the seed 초5 child is covered.
async function fillAfterSchool(screen: Screen, start: string, end: string) {
  await screen.getByLabel('과목').fill('로봇')
  await screen.getByLabel('금').check()
  await screen.getByLabel('시작 시각').fill(start)
  await screen.getByLabel('종료 시각').fill(end)
  await screen.getByLabel('월 교습비(원)').fill('30000')
  await screen.getByLabel('강사').fill('로봇 강사')
  await screen.getByLabel('대상 학년(시작)').selectOption('초3')
  await screen.getByLabel('대상 학년(끝)').selectOption('초6')
  await screen.getByLabel('정원(명)').fill('15')
  await screen.getByLabel('현재 인원(명)').fill('5')
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-19 5학년 수요일 하교 시각 13:40을 저장하면 새로 고친 뒤에도 13:40이다', async ({ app, screen }) => {
  await signInSchool(app, screen)
  // The seed already has 13:40 for 5학년 Wednesday, so move it away first: otherwise the save is a no-op.
  await saveWednesday(screen, '14:10')
  await app.restart()
  await screen.getByRole('tab', '5학년').tap()
  await expect(screen.getByLabel('5학년 수요일 하교 시각')).toHaveValue('14:10', { timeout: 10_000 })

  await saveWednesday(screen, '13:40')
  await expect(screen.getByLabel('5학년 수요일 하교 시각')).toHaveValue('13:40')
  await app.restart()
  await screen.getByRole('tab', '5학년').tap()
  await expect(screen.getByLabel('5학년 수요일 하교 시각')).toHaveValue('13:40', { timeout: 10_000 })
})

test('TC-22 같은 학년·요일 14:00~15:00이 있으면 14:30~15:30은 화면에서 "시간이 겹칩니다", API는 422로 저장되지 않는다', async ({ app, screen }) => {
  await signInSchool(app, screen)
  const table = screen.getByRole('table', '방과후 프로그램 목록')
  const seeded = await table.getByRole('row').count()

  // GIVEN: the AC-03.3 robot program, 금 14:00~15:00.
  await screen.getByRole('button', '방과후 프로그램 추가').tap()
  await fillAfterSchool(screen, '14:00', '15:00')
  await screen.getByRole('button', '방과후 프로그램 저장').tap()
  const robot = table.getByRole('row').filter({ hasText: '로봇 강사' })
  await expect(robot).toHaveCount(1, { timeout: 10_000 })
  await expect(robot).toContainText('14:00~15:00')
  await expect(robot).toContainText('30,000원')
  await expect(table.getByRole('row')).toHaveCount(seeded + 1)

  // WHEN (screen): 14:30~15:30 on the same grades and day.
  await screen.getByRole('button', '방과후 프로그램 추가').tap()
  await fillAfterSchool(screen, '14:30', '15:30')
  await screen.getByRole('button', '방과후 프로그램 저장').tap()
  await expect(screen.getByText(OVERLAP).first()).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByLabel('시작 시각')).toHaveAttribute('aria-invalid', 'true')
  await expect(table.getByRole('row')).toHaveCount(seeded + 1)

  // WHEN (API): the same values from a fresh school session.
  const login = await fetch(new URL('/api/auth/login', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: 'school-elem', password: seedPassword() }),
  })
  expect(login.status).toBe(200)
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  expect(cookie).toBeTruthy()
  const list = async () => {
    const response = await fetch(new URL('/api/school/after-school', app.baseUrl), { headers: { cookie } })
    expect(response.status).toBe(200)
    return (await response.json()) as unknown[]
  }
  const before = await list()
  const response = await fetch(new URL('/api/school/after-school', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      subject: '로봇', days: ['fri'], start: '14:30', end: '15:30', monthly_tuition: 30000, monthly_other: 0,
      instructor: '로봇 강사', grade_min: 3, grade_max: 6, capacity: 15, enrolled: 5,
    }),
  })
  expect(response.status).toBe(422)
  expect(((await response.json()) as { detail: string }).detail).toBe('time_overlap')
  expect(await list()).toEqual(before)

  await app.restart()
  await expect(screen.getByRole('table', '방과후 프로그램 목록').getByRole('row')).toHaveCount(seeded + 1, { timeout: 10_000 })
})

test('TC-20 초5 수요일 하교 13:40을 저장한 뒤 그 학교 초5 자녀로 일정을 만들면 수요일 수업 시작이 모두 13:40 + 이동 근사 시간 이후다', async ({ app, screen, browser }) => {
  // GIVEN AC-03.1: a real write (the seed already has 13:40, so move it away and back).
  await signInSchool(app, screen)
  await saveWednesday(screen, '14:10')
  await saveWednesday(screen, '13:40')

  await app.clearState()
  await browser.setViewport({ width: 1280, height: 900 }) // weekly table (768px 이상)
  await signInParent(app, screen)
  await app.open('/chat')
  // 수학만·가능 요일 월·수·금·보통: the default plan has no Wednesday class (the check below would pass empty),
  // and 영어 on 월·수 is full in the seed, so 영어·수학 on 월·수·금 has no feasible plan.
  await saveConditions(app, screen, async (sheet) => {
    await sheet.getByRole('group', '선호 과목').getByRole('button', '영어').tap()
    const days = sheet.getByRole('group', '가능 요일')
    for (const day of ['월', '수', '금']) await days.getByRole('button', day).tap()
    await sheet.getByRole('radio', '보통').tap()
  })
  await makePlan(screen)
  const days = await week(screen)
  const wed = days.find((d) => d.day === '수')!
  expect(wed.school, '수요일 학교 블록이 저장한 하교 시각').toBe('13:40')
  expect(wed.classes.length, '수요일 수업이 1개 이상').toBeGreaterThan(0)

  // 이동 근사 시간 per program, from the same child's recommendations (travel from the school, AD-7).
  const travel = await browser.evaluate(async () => {
    const children = (await (await fetch('/api/children')).json()) as { id: string; grade: number }[]
    const child = children.find((c) => c.grade === 5)!
    const response = await fetch('/api/recommendations', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ child_id: child.id }),
    })
    return ((await response.json()) as { items: { institution_name: string; days: string[]; start: string; end: string; travel_min: number }[] }).items
  })
  for (const c of wed.classes) {
    const match = travel.filter((r) => r.days.includes('wed') && c.text.includes(r.institution_name) && r.start === c.start && r.end === c.end)
    expect(match, `이동 시간을 찾을 수업: ${c.text}`).toHaveLength(1)
    expect(minutes(c.start) >= minutes('13:40') + match[0].travel_min, `${c.text} (이동 ${match[0].travel_min}분)`).toBe(true)
  }
})

// Column values of every body row, by header name.
async function rows(table: Locator): Promise<Record<string, string>[]> {
  const header = await table.getByRole('columnheader').allTextContents()
  const out: Record<string, string>[] = []
  for (const r of await table.getByRole('row').all()) {
    const cells = await r.getByRole('cell').allTextContents()
    if (cells.length) out.push(Object.fromEntries(header.map((h, i) => [h.trim(), cells[i].trim()])))
  }
  return out
}

test('TC-21 학교가 로봇 방과후(금 14:00~15:00)를 저장하면 로봇을 선호 과목에 넣은 그 학교 초5 보호자의 비교표에 유형 "방과후"로 나온다', async ({ app, screen, browser }) => {
  await signInSchool(app, screen)
  await screen.getByRole('button', '방과후 프로그램 추가').tap()
  await fillAfterSchool(screen, '14:00', '15:00')
  await screen.getByRole('button', '방과후 프로그램 저장').tap()
  const robot = screen.getByRole('table', '방과후 프로그램 목록').getByRole('row').filter({ hasText: '로봇 강사' })
  await expect(robot).toHaveCount(1, { timeout: 10_000 })

  await app.clearState()
  await browser.setViewport({ width: 1280, height: 900 }) // comparison table (768px 이상)
  await signInParent(app, screen)
  await app.open('/chat')
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: { ...AROUND_REPLY, subjects: ['로봇'] } })
  await send(screen, '초5 아이 로봇 배우게 월 100만원 전후로')
  await expect(screen.getByRole('article', '조건 카드')).toBeVisible({ timeout: 15_000 })
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })
  await screen.getByRole('button', '추천 보기').tap()
  const table = screen.getByRole('table', '추천 비교표')
  await expect(table).toBeVisible({ timeout: 15_000 })
  const body = await rows(table)
  const hit = body.filter((r) => r['과목'] === '로봇' && r['요일'] === '금' && r['시간'] === '14:00~15:00')
  expect(hit, JSON.stringify(body)).toHaveLength(1)
  expect(hit[0]['유형']).toBe('방과후')
  expect(hit[0]['학원명']).toBe('한빛초등학교')
})

test('#3 회귀 방과후 수정 저장한 프로그램을 수정하면 같은 행이 새 시간으로 바뀐다', async ({ app, screen }) => {
  // PR #26 Codex P2: REQ-03 "입력·수정" — the list must offer an edit, not only delete-and-recreate.
  await signInSchool(app, screen)
  const table = screen.getByRole('table', '방과후 프로그램 목록')
  await screen.getByRole('button', '방과후 프로그램 추가').tap()
  await fillAfterSchool(screen, '14:00', '15:00')
  await screen.getByRole('button', '방과후 프로그램 저장').tap()
  const robot = table.getByRole('row').filter({ hasText: '로봇 강사' })
  await expect(robot).toHaveCount(1, { timeout: 10_000 })
  const rows = await table.getByRole('row').count()

  await screen.getByRole('button', '로봇 금 14:00 수정').tap()
  await expect(screen.getByLabel('과목')).toHaveValue('로봇')
  await expect(screen.getByLabel('시작 시각')).toHaveValue('14:00')
  await screen.getByLabel('시작 시각').fill('16:30')
  await screen.getByLabel('종료 시각').fill('17:30')
  await screen.getByRole('button', '방과후 프로그램 저장').tap()

  await expect(robot).toContainText('16:30~17:30', { timeout: 10_000 })
  await expect(robot).toHaveCount(1)
  await expect(table.getByRole('row')).toHaveCount(rows)
  await app.restart()
  const reloaded = screen.getByRole('table', '방과후 프로그램 목록').getByRole('row').filter({ hasText: '로봇 강사' })
  await expect(reloaded).toContainText('16:30~17:30', { timeout: 10_000 })
})
