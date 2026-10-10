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

// #5 회귀 (preview, 정대철_테스트 12:48Z): before /api/children answers, the page had no child and answered
// "먼저 자녀를 등록해 주세요" (experience 169행 is for a parent with no child; 98행 loading = button disabled).
test('#5 회귀 자녀 목록 불러오는 중에는 보내기가 비활성이고 "먼저 자녀를 등록해 주세요"가 나오지 않으며, 목록이 오면 보내서 조건 카드가 보인다', async ({ app, screen, browser }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  await browser.route('**/api/children', async (route) => {
    await held
    await route.continue()
  })
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await app.open('/chat')
  const input = screen.getByLabel('챗봇에 보낼 말')
  await input.fill(AROUND)
  await input.press('Enter')
  await expect(screen.getByText('먼저 자녀를 등록해 주세요')).not.toBeVisible()
  await expect(screen.getByRole('button', '보내기')).toBeDisabled()
  await expect(screen.getByText('처리하고 있어요')).toBeVisible()

  release()
  await browser.unroute('**/api/children')
  await expect(screen.getByRole('button', '보내기')).toBeEnabled({ timeout: 10_000 })
  await screen.getByRole('button', '보내기').tap()
  await expectAroundCard(screen)
  await expect(screen.getByText('먼저 자녀를 등록해 주세요')).not.toBeVisible()
})
