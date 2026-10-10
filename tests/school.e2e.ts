import { beforeEach, expect, test, type App, type Screen } from 'e2e'

// REQ-03 in the browser (FLOW-03): TC-19 (AC-03.1), TC-22 (AC-03.4).
// TC-20 needs schedule generation (#7) and TC-21 the parent recommendation table (#6); the school-side
// halves of AC-03.3 (saving the robot program) run here until then.
// The app must run with ENABLE_TEST_ROUTES=1 and the seed password in SEED_PASSWORD.

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

  // GIVEN: the AC-03.3 robot program, 금 14:00~15:00 (school-side half of TC-21).
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
