import { expect, type App, type Screen } from 'e2e'
import { beforeEach, test, type Browser } from '@e2e-dev/web'
import { AROUND, TASK, api, send, signInParent } from './chat-support'
import { weekView } from './plan-support'
import { rows, showRecommendations } from './recommend-support'
import { asOrg, asParent } from './viewport'

// REQ-02 in the browser (FLOW-05): TC-13 (AC-02.1), TC-14 (AC-02.2), TC-16 (AC-02.4),
// TC-17 (AC-02.5: list, comparison table and schedule draft), TC-18 (AC-02.6).
// The app must run with ENABLE_TEST_ROUTES=1, LLM_PROVIDER=fake and the seed password in SEED_PASSWORD.

async function resetSeed(app: App) {
  const response = await fetch(new URL('/api/test/reset', app.baseUrl), { method: 'POST' })
  expect(response.status).toBe(200)
}

// Academy screens are checked at the desktop width (prd 4.2); parent steps switch back to the phone width.
async function signInAcademy(app: App, screen: Screen, browser: Browser, loginId = 'academy-a') {
  await asOrg(browser)
  const password = process.env.SEED_PASSWORD
  expect(password, 'SEED_PASSWORD').toBeTruthy()
  await app.open('/login')
  await screen.getByLabel('아이디').fill(loginId)
  await screen.getByLabel('비밀번호').fill(password!)
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', '학원 프로그램 관리')).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByRole('table', '학원 프로그램 목록')).toBeVisible({ timeout: 10_000 })
}


async function fillAc021(screen: Screen) {
  await screen.getByLabel('과목').fill('코딩')
  await screen.getByLabel('유형').selectOption('교과 학원')
  await screen.getByLabel('화').check()
  await screen.getByLabel('목').check()
  await screen.getByLabel('시작 시각').fill('16:00')
  await screen.getByLabel('종료 시각').fill('17:00')
  await screen.getByLabel('월 교습비(원)').fill('200000')
  await screen.getByLabel('월 기타경비(원)').fill('20000')
  await screen.getByLabel('강사').fill('코딩 강사')
  await screen.getByLabel('대상 학년(시작)').selectOption('초4')
  await screen.getByLabel('대상 학년(끝)').selectOption('초6')
  await screen.getByLabel('정원(명)').fill('10')
  await screen.getByLabel('현재 인원(명)').fill('3')
  await screen.getByLabel('위도').fill('37.5012')
  await screen.getByLabel('경도').fill('127.0396')
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-13 코딩 프로그램을 등록하면 교습비·기타경비가 나뉜 채 목록에 남는다', async ({ app, screen, browser }) => {
  await signInAcademy(app, screen, browser)
  await screen.getByRole('button', '프로그램 등록').tap()
  await fillAc021(screen)
  await screen.getByRole('button', '프로그램 저장').tap()

  const coding = screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: '코딩' })
  await expect(coding).toHaveCount(1, { timeout: 10_000 })
  await expect(coding).toContainText('200,000원')
  await expect(coding).toContainText('20,000원')
  await expect(coding).toContainText('화·목')
  await expect(coding).toContainText('16:00~17:00')

  await app.restart() // reload: the row comes back from the server
  const reloaded = screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: '코딩' })
  await expect(reloaded).toHaveCount(1, { timeout: 10_000 })
  await expect(reloaded).toContainText('200,000원')
  await expect(reloaded).toContainText('20,000원')
})

test('TC-14 잘못된 값 4종은 칸 옆 오류를 보이고 목록에 추가되지 않는다', async ({ app, screen, browser }) => {
  await signInAcademy(app, screen, browser)
  const table = screen.getByRole('table', '학원 프로그램 목록')
  const before = await table.getByRole('row').count()
  await screen.getByRole('button', '프로그램 등록').tap()

  const cases: [string, string, string, string][] = [
    ['종료 시각', '15:30', '종료 시각', '종료 시각은 시작 시각보다 늦어야 해요'],
    ['월 교습비(원)', '-1000', '월 교습비(원)', '월 교습비는 0원 이상이어야 해요'],
    ['정원(명)', '0', '정원(명)', '정원은 1명 이상이어야 해요'],
    ['위도', '', '위도', '위도를 입력해 주세요'],
  ]
  for (const [label, value, field, message] of cases) {
    await fillAc021(screen)
    if (label === '정원(명)') await screen.getByLabel('현재 인원(명)').fill('0')
    if (label === '위도') await screen.getByLabel('경도').fill('')
    await screen.getByLabel(label).fill(value)
    await screen.getByRole('button', '프로그램 저장').tap()
    await expect(screen.getByText(message)).toBeVisible()
    await expect(screen.getByLabel(field)).toHaveAttribute('aria-invalid', 'true')
    await expect(table.getByRole('row')).toHaveCount(before)
  }
  await expect(screen.getByText('경도를 입력해 주세요')).toBeVisible()
  await app.restart()
  await asOrg(browser)
  await expect(screen.getByRole('table', '학원 프로그램 목록').getByRole('row')).toHaveCount(before, { timeout: 10_000 })
})

// The chat card's conditions come from the LLM double; the parent saves them and opens the table.
const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }

async function recommendAs(app: App, screen: Screen, browser: Browser, reply: object, message: string): Promise<Record<string, string>[]> {
  await asParent(browser)
  await app.clearState()
  await signInParent(app, screen)
  await app.open('/chat')
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: reply })
  await send(screen, message)
  await expect(screen.getByRole('article', '조건 카드')).toBeVisible({ timeout: 15_000 })
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })
  return showTable(screen)
}

// Same parent again: the chat page opens on the saved card, so the table uses the saved conditions.
async function recommendSaved(app: App, screen: Screen, browser: Browser): Promise<Record<string, string>[]> {
  await asParent(browser)
  await app.clearState()
  await signInParent(app, screen)
  await app.open('/chat')
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })
  return showTable(screen)
}

// The parent comparison opens as cards in the phone frame (tests/recommend-support.ts reads either shape).
async function showTable(screen: Screen): Promise<Record<string, string>[]> {
  await showRecommendations(screen)
  return rows(screen)
}

type Key = { 학원명: string; 과목: string; 요일: string; 시간: string }
const hits = (body: Record<string, string>[], k: Key) =>
  body.filter((r) => r['학원명'] === k.학원명 && r['과목'] === k.과목 && r['요일'] === k.요일 && r['시간'] === k.시간)

test('TC-16 학원이 피아노(예체능 학원)를 등록하면 피아노를 선호 과목에 넣은 초5 보호자의 비교표에 나온다', async ({ app, screen, browser }) => {
  await signInAcademy(app, screen, browser)
  await screen.getByRole('button', '프로그램 등록').tap()
  await fillAc021(screen)
  await screen.getByLabel('과목').fill('피아노')
  await screen.getByLabel('유형').selectOption('예체능 학원')
  await screen.getByLabel('화').uncheck()
  await screen.getByLabel('목').uncheck()
  await screen.getByLabel('월').check()
  await screen.getByLabel('수').check()
  await screen.getByLabel('시작 시각').fill('17:10')
  await screen.getByLabel('종료 시각').fill('17:50')
  await screen.getByLabel('월 교습비(원)').fill('150000')
  await screen.getByLabel('월 기타경비(원)').fill('10000')
  await screen.getByRole('button', '프로그램 저장').tap()
  const piano = screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: '피아노' })
  await expect(piano.filter({ hasText: '17:10~17:50' })).toHaveCount(1, { timeout: 10_000 })

  const body = await recommendAs(app, screen, browser, { ...AROUND_REPLY, subjects: ['피아노'] }, '초5 아이 피아노 배우게 월 100만원 전후로')
  const row = hits(body, { 학원명: '새봄영어수학학원', 과목: '피아노', 요일: '월·수', 시간: '17:10~17:50' })
  expect(row, JSON.stringify(body)).toHaveLength(1)
  expect(row[0]['유형']).toBe('예체능 학원')
  for (const r of body) expect(r['과목']).toBe('피아노')
})

// Seed (apps/api/app/seed/data/academies.json): b-elem-math-undisclosed has no monthly tuition.
const UNDISCLOSED: Key = { 학원명: '다온수학학원', 과목: '수학', 요일: '화·목', 시간: '16:40~18:00' }

test('TC-17 시드 미공개 프로그램이 학원 목록에 "미공개"로 보이고 AC-06.1 조건의 비교표와 일정에 없다', async ({ app, screen, browser }) => {
  await signInAcademy(app, screen, browser, 'academy-b') // the seed undisclosed program belongs to academy B
  const table = screen.getByRole('table', '학원 프로그램 목록')
  const undisclosed = table.getByRole('row').filter({ hasText: '미공개' })
  await expect(undisclosed).toHaveCount(1)
  await expect(undisclosed).toContainText(UNDISCLOSED.시간)

  const body = await recommendAs(app, screen, browser, AROUND_REPLY, AROUND)
  expect(body.length).toBeGreaterThan(0)
  expect(hits(body, UNDISCLOSED)).toEqual([])
  for (const r of body) expect(r['월 교습비']).not.toContain('미공개')

  // Schedule half (#7): the draft from the same saved conditions has classes, none of them the undisclosed one.
  await screen.getByRole('button', '일정 만들기').tap()
  const week = weekView(screen)
  await expect(week).toBeVisible({ timeout: 15_000 })
  const classes: string[] = []
  for (const day of UNDISCLOSED.요일.split('·').concat(['월', '수', '금', '토', '일'])) {
    classes.push(...(await week.getByRole('listitem', `${day} 수업`).allTextContents()).map((t) => `${day} ${t}`))
  }
  expect(classes.length, 'draft has classes').toBeGreaterThan(0)
  const undisclosedIn = classes.filter((c) => c.includes(UNDISCLOSED.학원명) && c.includes(UNDISCLOSED.시간))
  expect(undisclosedIn, JSON.stringify(classes)).toEqual([])
})

// Seed b-elem-math (초3~초6, 월·수, disclosed) is in the AC-06.1 table until academy B deletes it.
const DELETED: Key = { 학원명: '다온수학학원', 과목: '수학', 요일: '월·수', 시간: '16:30~17:50' }

test('TC-18 확정 계획에 쓰이지 않은 프로그램을 삭제하면 학원 목록과 보호자 비교표에서 사라진다', async ({ app, screen, browser }) => {
  const before = await recommendAs(app, screen, browser, AROUND_REPLY, AROUND)
  expect(hits(before, DELETED), 'listed before the delete').toHaveLength(1)

  await app.clearState()
  await signInAcademy(app, screen, browser, 'academy-b')
  const table = screen.getByRole('table', '학원 프로그램 목록')
  const count = await table.getByRole('row').count()
  const target = table.getByRole('row').filter({ hasText: DELETED.시간 })
  await expect(target).toHaveCount(1)
  await target.getByRole('button').filter({ hasText: '삭제' }).tap()
  await expect(screen.getByRole('dialog', '이 프로그램을 삭제할까요?')).toBeVisible()
  await screen.getByRole('button', '삭제하기').tap()
  await expect(table.getByRole('row')).toHaveCount(count - 1, { timeout: 10_000 })
  await expect(table.getByRole('row').filter({ hasText: DELETED.시간 })).toHaveCount(0)
  await app.restart()
  await asOrg(browser)
  await expect(screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: DELETED.시간 })).toHaveCount(0, { timeout: 10_000 })

  const after = await recommendSaved(app, screen, browser)
  expect(after.length).toBeGreaterThan(0)
  expect(hits(after, DELETED)).toEqual([])
})
