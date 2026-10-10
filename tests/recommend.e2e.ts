import { expect, type App, type Locator, type Screen } from 'e2e'
import { beforeEach, test, type Browser } from '@e2e-dev/web'
import { AROUND, TASK, api, resetSeed, send, signInParent } from './chat-support'

// REQ-06 with the LLM double: TC-35 (AC-06.1), TC-36 (AC-06.2), TC-37 (AC-06.3), TC-38 (AC-06.4),
// TC-39 (AC-06.5) and TC-80 (AC-06.7). Rows are never pinned: each TC checks properties of every row.
// The app runs with ENABLE_TEST_ROUTES=1 and LLM_PROVIDER=fake; reset (AC-11.4) clears the double too.
const REASONS = 'recommend_reasons'
const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }
const COLUMNS = ['학원명', '과목', '유형', '요일', '시간', '월 교습비', '월 기타경비', '이동', '추천 이유']

type Rec = { program_id: string; institution_name: string; subject: string; reason: string }

beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
})

// AC-05.1 conditions (초5, 영어·수학, 1,000,000 전후 → 상한 1,100,000) saved from the chat card.
async function saveAroundConditions(app: App, screen: Screen) {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요')).toBeVisible({ timeout: 10_000 })
}

async function showRecommendations(screen: Screen): Promise<Locator> {
  await screen.getByRole('button', '추천 보기').tap()
  const table = screen.getByRole('table', '추천 비교표')
  await expect(table).toBeVisible({ timeout: 15_000 })
  return table
}

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

// Same-origin call with the signed-in cookie, for steps the screen does not expose (child interests, row ids).
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

async function pageFetch(browser: Browser, path: string, method = 'GET', body: Json = null): Promise<{ status: number; json: Json }> {
  return browser.evaluate(async (arg: { path: string; method: string; body: Json }) => {
    const r = await fetch(arg.path, { method: arg.method, headers: { 'content-type': 'application/json' }, body: arg.body === null ? undefined : JSON.stringify(arg.body) })
    return { status: r.status, json: (await r.json().catch(() => null)) as Json }
  }, { path, method, body })
}

async function childId(browser: Browser): Promise<string> {
  const { json } = await pageFetch(browser, '/api/children')
  const list = json as unknown as { id: string }[]
  expect(list.length).toBe(1)
  return list[0].id
}

test('TC-35 기준 시나리오 조건으로 추천하면 9개 열이 보이고 모든 행 과목이 영어 또는 수학이다', async ({ app, screen }) => {
  await saveAroundConditions(app, screen)
  const table = await showRecommendations(screen)
  expect((await table.getByRole('columnheader').allTextContents()).map((h) => h.trim())).toEqual(COLUMNS)
  const body = await rows(table)
  expect(body.length).toBeGreaterThan(0)
  for (const r of body) {
    for (const c of COLUMNS) expect(r[c], c).not.toBe('')
    expect(['영어', '수학']).toContain(r['과목'])
  }
})

test('TC-36 비교표의 모든 이동 값 옆에 근사가 보인다', async ({ app, screen }) => {
  await saveAroundConditions(app, screen)
  const body = await rows(await showRecommendations(screen))
  expect(body.length).toBeGreaterThan(0)
  for (const r of body) expect(r['이동']).toMatch(/km · \d+분 근사$/)
})

// Seed rows (apps/api/app/seed/data/academies.json) that must stay out: a-mid1-math (grade 7–7) and c-elem-english-full (10/10).
const EXCLUDED = [
  { 학원명: '새봄영어수학학원', 과목: '수학', 요일: '월·수', 시간: '16:00~17:40' },
  { 학원명: '푸른숲영어학원', 과목: '영어', 요일: '월·수', 시간: '15:00~16:20' },
]

test('TC-37 중1 전용 수학과 마감 영어는 비교표에 없다', async ({ app, screen }) => {
  await saveAroundConditions(app, screen)
  const body = await rows(await showRecommendations(screen))
  expect(body.length).toBeGreaterThan(0)
  for (const x of EXCLUDED) {
    const hit = body.filter((r) => r['학원명'] === x.학원명 && r['과목'] === x.과목 && r['요일'] === x.요일 && r['시간'] === x.시간)
    expect(hit, JSON.stringify(x)).toEqual([])
  }
})

test('TC-38 관심사를 과학으로 저장하고 추천하면 대역 요청의 관심사가 과학이고 추천 이유가 채워진다', async ({ app, screen, browser }) => {
  await saveAroundConditions(app, screen)
  const id = await childId(browser)
  const child = (await pageFetch(browser, `/api/children/${id}`)).json as { [key: string]: Json }
  const put = await pageFetch(browser, `/api/children/${id}`, 'PUT', { ...pickEditable(child), interests: ['과학'] })
  expect(put.status).toBe(200)

  // Fixed reasons need the row ids the engine picks: ask once, then answer every row.
  const first = (await pageFetch(browser, '/api/recommendations', 'POST', { child_id: id })).json as unknown as { items: Rec[] }
  expect(first.items.length).toBeGreaterThan(0)
  const reasons = first.items.map((r) => ({ program_id: r.program_id, reason: `${r.subject} 과학 관심사와 함께 보기 좋아요` }))
  await api(app, '/api/test/llm', { task: REASONS, mode: 'fixed', response: { reasons } })

  const body = await rows(await showRecommendations(screen))
  expect(body.length).toBeGreaterThan(0)
  for (const r of body) expect(r['추천 이유']).toContain('과학 관심사와 함께 보기 좋아요')

  const requests = (await api(app, '/api/test/llm/requests')) as { task: string; messages: { role: string; content: string }[] }[]
  const last = requests.filter((q) => q.task === REASONS).at(-1)
  expect(last, 'recommend request').toBeTruthy()
  const sent = last!.messages.map((m) => m.content).join('\n')
  expect(sent).toContain('관심사 과학')
})

test('TC-39 대역이 오류를 내면 템플릿 설명이 보이고 행 수는 같다', async ({ app, screen, browser }) => {
  await saveAroundConditions(app, screen)
  const id = await childId(browser)
  const reasons = ((await pageFetch(browser, '/api/recommendations', 'POST', { child_id: id })).json as unknown as { items: Rec[] }).items
  await api(app, '/api/test/llm', { task: REASONS, mode: 'fixed', response: { reasons: reasons.map((r) => ({ program_id: r.program_id, reason: '대역 설명' })) } })
  const normal = await rows(await showRecommendations(screen))

  await api(app, '/api/test/llm', { task: REASONS, mode: 'error' })
  await app.open('/chat')
  const table = await showRecommendations(screen)
  const fallback = await rows(table)
  expect(fallback.length).toBe(normal.length)
  for (const r of fallback) expect(r['추천 이유']).toMatch(new RegExp(`^${r['과목']} 주 \\d+회, 학교에서 이동 약 \\d+분\\(근사\\)`))
  await expect(table.getByText('AI 설명을 불러오지 못해 기본 설명을 보여 드려요').first()).toBeVisible()
})

test('TC-80 유형 교과 학원·요일 월·수·금으로 저장하고 추천하면 1행 이상, 모든 행이 그 조건 안이다', async ({ app, screen }) => {
  await saveAroundConditions(app, screen)
  await screen.getByRole('article', '조건 카드').getByRole('button', '고치기').tap()
  const sheet = screen.getByRole('dialog', '조건을 고쳐 주세요')
  await sheet.getByRole('group', '학원 유형').getByRole('button', '교과 학원').tap()
  const days = sheet.getByRole('group', '가능 요일')
  for (const day of ['월', '수', '금']) await days.getByRole('button', day).tap()
  await sheet.getByRole('button', '적용').tap()
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })

  const body = await rows(await showRecommendations(screen))
  expect(body.length).toBeGreaterThan(0)
  for (const r of body) {
    expect(r['유형']).toBe('교과 학원')
    for (const d of r['요일'].split('·')) expect(['월', '수', '금']).toContain(d)
  }
})

// PUT /api/children/{id} takes the editable fields only (unknown keys are 422).
function pickEditable(child: { [key: string]: Json }): { [key: string]: Json } {
  const { id: _id, ...rest } = child
  return rest
}
