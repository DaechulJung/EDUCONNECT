import { readFileSync } from 'node:fs'
import { expect, type App, type Screen } from 'e2e'
import { beforeEach, test } from '@e2e-dev/web'
import { resetSeed, signInParent } from './chat-support'
import { makePlan, monthlyTotal, saveConditions, week, won } from './plan-support'

// REQ-08 on the screen: TC-47 (AC-08.1), TC-48 (AC-08.2), TC-49 (AC-08.3). Every TC starts from the seed
// and the AC-07.1 plan (기준 시나리오); the programs it holds are read from the screen, never pinned.
beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
  await saveConditions(app, screen)
  await makePlan(screen)
  await expect(screen.getByRole('table', '주간 일정표')).toBeVisible({ timeout: 15_000 })
})

// 내역 line "새봄영어수학학원 영어450,000원 + 30,000원 = 480,000원" → institution and monthly (교습비 + 기타경비).
async function englishLine(screen: Screen): Promise<{ institution: string; monthly: number }> {
  await screen.getByText('프로그램별 내역').tap()
  const lines = await screen.getByRole('list', '월 학원비 내역').getByRole('listitem').allTextContents()
  for (const line of lines) {
    const m = line.trim().match(/^(.+) 영어\s*([\d,]+)원 \+ ([\d,]+)원 = ([\d,]+)원$/)
    if (m) {
      expect(won(m[2]) + won(m[3])).toBe(won(m[4]))
      return { institution: m[1], monthly: won(m[4]) }
    }
  }
  throw new Error(`영어 내역 없음: ${lines.join(' | ')}`)
}

const classesOf = async (screen: Screen, institution: string, subject: string) =>
  (await week(screen)).flatMap((d) => d.classes.map((c) => ({ ...c, day: d.day }))).filter((c) => c.subject === subject && c.text.includes(institution))

test('TC-47 일정에서 영어 프로그램 하나를 빼면 그 수업이 사라지고 월 학원비가 그 프로그램 금액만큼 준다', async ({ screen }) => {
  const before = await monthlyTotal(screen)
  const english = await englishLine(screen)
  expect((await classesOf(screen, english.institution, '영어')).length).toBeGreaterThan(0)

  await screen.getByRole('button', `${english.institution} 영어 빼기`).first().tap()

  await expect.poll(async () => monthlyTotal(screen), { timeout: 15_000 }).toBe(before - english.monthly)
  expect(await classesOf(screen, english.institution, '영어')).toEqual([])
})

// An academy staff member moves an English class of another academy into school hours through the product API
// (PUT /api/academy/programs/{id}); the seed has no such candidate. reset in beforeEach puts it back.
// The class is picked from the seed JSON (초5 대상·공개·마감 아님, not the draft's academy) and its id from the
// parent's recommendations, because the program list API arrives with #2.
async function signIn(app: App, loginId: string): Promise<string> {
  const response = await fetch(new URL('/api/auth/login', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: loginId, password: process.env.SEED_PASSWORD }),
  })
  expect(response.status).toBe(200)
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

type SeedProgram = { key: string; subject: string; grade_min: number; grade_max: number; monthly_tuition: number | null; capacity: number; enrolled: number; start: string } & Record<string, unknown>
type SeedAcademy = { key: string; name: string; lat: number; lng: number; programs: SeedProgram[] }

async function moveEnglishIntoSchoolHours(app: App, draftInstitution: string): Promise<string> {
  const seed = JSON.parse(readFileSync(new URL('../apps/api/app/seed/data/academies.json', import.meta.url), 'utf8')) as { academies: SeedAcademy[] }
  const pick = seed.academies
    .filter((a) => a.name !== draftInstitution)
    .flatMap((a) => a.programs.map((p) => ({ academy: a, program: p })))
    .find(({ program: p }) => p.subject === '영어' && p.grade_min <= 5 && 5 <= p.grade_max && p.monthly_tuition !== null && p.enrolled < p.capacity)
  expect(pick, '다른 학원의 초5 영어 반').toBeTruthy()
  const { academy, program } = pick!

  const parent = await signIn(app, 'parent1')
  const [child] = await call(app, parent, 'GET', '/api/children')
  const recs = await call(app, parent, 'POST', '/api/recommendations', { child_id: child.id })
  const rec = recs.items.find((r: { institution_name: string; subject: string; start: string }) => r.institution_name === academy.name && r.subject === '영어' && r.start === program.start)
  expect(rec, `${academy.name} 영어 추천`).toBeTruthy()

  const { key: _key, ...fields } = program
  const accounts = JSON.parse(readFileSync(new URL('../apps/api/app/seed/data/accounts.json', import.meta.url), 'utf8')) as { accounts: { login_id: string; institution: string | null }[] }
  const staff = await signIn(app, accounts.accounts.find((x) => x.institution === academy.key)!.login_id)
  await call(app, staff, 'PUT', `/api/academy/programs/${rec.program_id}`, { ...fields, lat: academy.lat, lng: academy.lng, days: ['tue', 'thu'], start: '14:00', end: '15:00' })
  return '14:00~15:00'
}

test('TC-48 일정의 영어 수업을 학교 시간과 겹치는 프로그램으로 바꾸면 그 칸에 시간 중복이 보이고 확정 버튼이 비활성이다', async ({ app, screen }) => {
  const english = await englishLine(screen)
  const span = await moveEnglishIntoSchoolHours(app, english.institution)
  await expect(screen.getByRole('button', '일정 확정')).toBeEnabled()

  await screen.getByRole('button', `${english.institution} 영어 바꾸기`).first().tap()
  const sheet = screen.getByRole('dialog', '영어 수업 바꾸기')
  await sheet.getByRole('button', new RegExp(span)).first().tap()
  // Wait for the server's re-judged draft before reading the table (it re-renders when the answer lands).
  await expect(screen.getByRole('button', '일정 확정')).toBeDisabled({ timeout: 15_000 })

  const days = await week(screen)
  const swapped = days.flatMap((d) => d.classes).filter((c) => `${c.start}~${c.end}` === span)
  expect(swapped.length).toBeGreaterThan(0)
  for (const c of swapped) expect(c.text).toContain('시간 중복')
  await expect(screen.getByRole('button', '일정 확정')).toBeDisabled()
  await expect(screen.getByText('겹치는 수업이 있어요. 바꾸거나 빼 주세요')).toBeVisible()
})

// Day, subject and time of every class: the draft cells also hold the 빼기·바꾸기 buttons, the confirmed ones do not.
const slots = async (screen: Screen) =>
  (await week(screen)).map((d) => ({ day: d.day, school: d.school, classes: d.classes.map(({ subject, start, end }) => ({ subject, start, end })) }))

test('TC-49 위반이 없는 일정을 확정하면 일정 탭에 확정 계획으로 보이고 다시 로그인해도 같다', async ({ app, screen }) => {
  const draftTotal = await monthlyTotal(screen)
  const draftWeek = await slots(screen)

  await screen.getByRole('button', '일정 확정').tap()
  await screen.getByRole('dialog', '이 일정으로 확정할까요?').getByRole('button', '일정 확정').tap()

  const confirmed = screen.getByRole('region', '확정 계획')
  await expect(confirmed).toBeVisible({ timeout: 15_000 })
  expect(await slots(screen)).toEqual(draftWeek)
  expect(await monthlyTotal(screen)).toBe(draftTotal)

  await screen.getByRole('button', '로그아웃').tap()
  await expect(screen.getByRole('heading', '로그인')).toBeVisible({ timeout: 10_000 })
  await signInParent(app, screen)
  await app.open('/schedule')
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  expect(await slots(screen)).toEqual(draftWeek)
  expect(await monthlyTotal(screen)).toBe(draftTotal)
})
