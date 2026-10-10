import { expect, type App, type Locator, type Screen } from 'e2e'
import { beforeEach, test } from '@e2e-dev/web'
import { AROUND, TASK, api, resetSeed, send, signInParent } from './chat-support'

// REQ-07 on the screen: TC-45 (AC-07.5) and TC-79 (AC-07.8). TC-41·43·44 are recorded from the pytest
// rows (test_engine.py); the two screen checks below are support for their '화면' half, not TC results.
// Plans are never pinned: each test checks properties of what the server generated from the seed.
const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }
const DAYS = ['월', '화', '수', '목', '금', '토', '일']

beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
})

// AC-05.1 card (초5, 영어·수학, 1,000,000 전후 → 상한 1,100,000), optionally edited, then saved.
async function saveConditions(app: App, screen: Screen, edit?: (sheet: Locator) => Promise<void>) {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })
  if (edit) {
    await screen.getByRole('article', '조건 카드').getByRole('button', '고치기').tap()
    const sheet = screen.getByRole('dialog', '조건을 고쳐 주세요')
    await edit(sheet)
    await sheet.getByRole('button', '적용').tap()
  }
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })
}

async function makePlan(screen: Screen) {
  await screen.getByRole('button', '일정 만들기').tap()
}

const won = (text: string) => Number(text.replace(/[^\d]/g, ''))
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

async function monthlyTotal(screen: Screen): Promise<number> {
  const group = screen.getByRole('group', '월 학원비')
  await expect(group).toBeVisible({ timeout: 15_000 })
  return won((await group.textContent()) ?? '')
}

// Every class and the school block per day, read from the weekly table cells (Monday first).
async function week(screen: Screen): Promise<{ day: string; school: string | null; classes: { subject: string; start: string; end: string }[] }[]> {
  const table = screen.getByRole('table', '주간 일정표')
  await expect(table).toBeVisible({ timeout: 15_000 })
  expect((await table.getByRole('columnheader').allTextContents()).map((h) => h.trim())).toEqual(DAYS)
  const out = []
  for (const day of DAYS) {
    const school = await table.getByRole('listitem', `${day} 학교`).allTextContents()
    const classes = []
    for (const li of await table.getByRole('listitem', `${day} 수업`).all()) {
      const text = (await li.textContent()) ?? ''
      const [, start, end] = text.match(/(\d\d:\d\d)~(\d\d:\d\d)/) ?? []
      // The cell starts with the subject; institution names like 새봄영어수학학원 hold both words.
      classes.push({ subject: text.trim().startsWith('영어') ? '영어' : text.trim().startsWith('수학') ? '수학' : text, start, end })
    }
    out.push({ day, school: school[0]?.match(/~(\d\d:\d\d)/)?.[1] ?? null, classes })
  }
  return out
}

test('TC-45 목표·상한 100,000원으로 저장하고 일정을 만들면 해 없음 안내와 완화할 조건이 보인다', async ({ app, screen }) => {
  await saveConditions(app, screen, async (sheet) => {
    await sheet.getByLabel('목표 월 예산(원)').fill('100000')
    await sheet.getByLabel('예산 상한(원)').fill('100000')
  })
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('100,000원')
  await makePlan(screen)
  await expect(screen.getByText('조건을 만족하는 일정이 없습니다')).toBeVisible({ timeout: 15_000 })
  const relax = await screen.getByRole('list', '완화할 조건').getByRole('listitem').allTextContents()
  expect(relax.length).toBeGreaterThan(0)
  for (const r of relax) expect(['예산 올리기', '요일 늘리기', '과목 줄이기']).toContain(r.trim())
  await expect(screen.getByRole('table', '주간 일정표')).not.toBeVisible()
})

test('TC-79 상한을 1,000,000원으로 고쳐 저장하고 일정을 만들면 일정이 보이고 월 학원비가 상한 이하다', async ({ app, screen }) => {
  await saveConditions(app, screen, async (sheet) => {
    await sheet.getByLabel('예산 상한(원)').fill('1000000')
  })
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,000,000원')
  await makePlan(screen)
  const days = await week(screen)
  expect(days.flatMap((d) => d.classes).length).toBeGreaterThan(0)
  await expect(screen.getByText('조건을 만족하는 일정이 없습니다')).not.toBeVisible()
  const total = await monthlyTotal(screen)
  expect(total).toBeGreaterThan(0)
  expect(total).toBeLessThanOrEqual(1_000_000)
})

// Support for TC-41·44 (AC-07.1·07.4 화면): school and classes together, no overlapping pair, 영어·수학 주 2회 이상.
test('기준 시나리오 일정은 월~일 표에 학교와 수업이 함께 있고 겹침이 없다', async ({ app, screen }) => {
  await saveConditions(app, screen)
  await makePlan(screen)
  const days = await week(screen)
  expect(days.some((d) => d.school && d.classes.length > 0)).toBe(true)
  for (const d of days) {
    const spans = d.classes.map((c) => [minutes(c.start), minutes(c.end)]).sort((a, b) => a[0] - b[0])
    if (d.school) for (const [s] of spans) expect(s, `${d.day} 학교 뒤`).toBeGreaterThanOrEqual(minutes(d.school))
    for (let i = 1; i < spans.length; i++) expect(spans[i][0], `${d.day} 겹침`).toBeGreaterThanOrEqual(spans[i - 1][1])
  }
  const count = (subject: string) => days.flatMap((d) => d.classes).filter((c) => c.subject === subject).length
  expect(count('영어')).toBeGreaterThanOrEqual(2)
  expect(count('수학')).toBeGreaterThanOrEqual(2)
})

// Support for TC-43 (AC-07.3 화면): the shown total is the sum of the per-program breakdown and within 1,100,000.
test('기준 시나리오 일정의 월 학원비는 프로그램별 내역의 합이고 상한 이하다', async ({ app, screen }) => {
  await saveConditions(app, screen)
  await makePlan(screen)
  const total = await monthlyTotal(screen)
  await screen.getByText('프로그램별 내역').tap()
  const lines = await screen.getByRole('list', '월 학원비 내역').getByRole('listitem').allTextContents()
  expect(lines.length).toBeGreaterThan(0)
  const sum = lines.map((l) => won(l.split('=').at(-1) ?? '')).reduce((a, b) => a + b, 0)
  expect(total).toBe(sum)
  expect(total).toBeGreaterThanOrEqual(900_000)
  expect(total).toBeLessThanOrEqual(1_100_000)
})
