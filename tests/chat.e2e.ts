import { beforeEach, expect, test } from 'e2e'
import { AROUND, TASK, WITHIN, api, expectAroundCard, resetSeed, row, send, signInParent } from './chat-support'

// REQ-05 with the LLM double (LLM_PROVIDER=fake): TC-28 (AC-05.1), TC-29 (AC-05.2).
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
