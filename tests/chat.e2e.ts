import { beforeEach, expect, test, type App, type Locator, type Screen } from 'e2e'
import { AROUND, TASK, WITHIN, api, expectAroundCard, resetSeed, row, send, signInParent } from './chat-support'

// REQ-05 with the LLM double (LLM_PROVIDER=fake): TC-28 (AC-05.1), TC-29 (AC-05.2),
// TC-30 (AC-05.3) and TC-31 (AC-05.4). A new conversation is a fresh /chat: no messages, saved card only.
// The double returns what the model would; the budget range rule (전후 = ×1.1) is the server's.
beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
})

test('TC-28 전후 문장을 보내면 조건 카드에 목표 1,000,000원·상한 1,100,000원이 보인다', async ({ app, screen }) => {
  await api(app, '/api/test/llm', {
    task: TASK,
    mode: 'fixed',
    response: { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' },
  })
  await send(screen, AROUND)
  await expectAroundCard(screen)
})

test('TC-29 안에서 문장을 보내면 목표와 상한이 모두 1,000,000원이다', async ({ app, screen }) => {
  await api(app, '/api/test/llm', {
    task: TASK,
    mode: 'fixed',
    response: { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'within', types: [], days: [], density: 'tight' },
  })
  await send(screen, WITHIN)
  await expect(row(screen, '목표 월 예산')).toContainText('1,000,000원', { timeout: 15_000 })
  await expect(row(screen, '예산 상한')).toContainText('1,000,000원')
})

const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }

// Edit the card in the sheet, apply, then save; '조건 저장' is enabled only while the card differs from the saved one.
async function editAndSave(screen: Screen, edit: (sheet: Locator) => Promise<void>) {
  await screen.getByRole('article', '조건 카드').getByRole('button', '고치기').tap()
  const sheet = screen.getByRole('dialog', '조건을 고쳐 주세요')
  await edit(sheet)
  await sheet.getByRole('button', '적용').tap()
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요')).toBeVisible({ timeout: 10_000 })
}

async function openNewConversation(app: App, screen: Screen) {
  await app.open('/chat')
  await expect(screen.getByRole('article', '조건 카드')).toBeVisible({ timeout: 15_000 })
  // No messages yet: the suggestion list shows only before the first message.
  await expect(screen.getByRole('list', '추천 질문')).toBeVisible()
}

test('TC-30 예산 상한을 1,000,000원으로 고쳐 저장하면 새 대화의 조건 카드에 1,000,000원이 남는다', async ({ app, screen }) => {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(row(screen, '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })

  await editAndSave(screen, async (sheet) => {
    await sheet.getByLabel('예산 상한(원)').fill('1000000')
  })
  await openNewConversation(app, screen)
  await expect(row(screen, '예산 상한')).toContainText('1,000,000원')
  await expect(row(screen, '예산 상한')).not.toContainText('1,100,000원')
})

test('TC-31 유형 교과 학원·요일 월·수·금으로 저장하면 새 대화의 조건 카드에 그 값이 남는다', async ({ app, screen }) => {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(row(screen, '학원 유형')).toBeVisible({ timeout: 15_000 })

  await editAndSave(screen, async (sheet) => {
    await sheet.getByRole('group', '학원 유형').getByRole('button', '교과 학원').tap()
    const days = sheet.getByRole('group', '가능 요일')
    for (const day of ['월', '수', '금']) await days.getByRole('button', day).tap()
  })
  await openNewConversation(app, screen)
  await expect(row(screen, '학원 유형')).toHaveText(/교과 학원$/)
  await expect(row(screen, '가능 요일')).toHaveText(/월·수·금$/)
})

// AD-15: the sheet's subject chips come from GET /api/catalog/subjects, so a subject an academy adds shows up
// without a code change. Before the fix the API answered 501 and the sheet showed BASE_SUBJECTS only.
test('#5 회귀 새 과목 칩: 학원이 등록한 과목 로봇이 조건 시트 칩에 보인다', async ({ app, screen }) => {
  const login = await fetch(new URL('/api/auth/login', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: 'academy-a', password: process.env.SEED_PASSWORD }),
  })
  expect(login.status).toBe(200)
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  const created = await fetch(new URL('/api/academy/programs', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      subject: '로봇', type: 'academy', days: ['tue'], start: '16:00', end: '17:00', monthly_tuition: 200000,
      monthly_other: 0, instructor: '시험 강사', grade_min: 4, grade_max: 6, capacity: 10, enrolled: 0, lat: 37.5, lng: 127.03,
    }),
  })
  expect(created.status).toBe(201)

  await app.open('/chat')
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(row(screen, '선호 과목')).toBeVisible({ timeout: 15_000 })
  await screen.getByRole('article', '조건 카드').getByRole('button', '고치기').tap()
  const chips = screen.getByRole('dialog', '조건을 고쳐 주세요').getByRole('group', '선호 과목')
  await expect(chips.getByRole('button', '로봇')).toBeVisible()
})
