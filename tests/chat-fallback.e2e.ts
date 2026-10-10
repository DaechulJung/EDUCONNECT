import { beforeEach, expect, test } from 'e2e'
import { AROUND, TASK, api, expectAroundCard, resetSeed, send, signInParent } from './chat-support'

// REQ-05 fallback paths: TC-32 (AC-05.5) and TC-33 (AC-05.6, SEC-04).
// TC-32 is only meaningful against an app started without Azure OpenAI keys (LLM_PROVIDER=none
// or auto with no key); with the double it still passes because the double's default is an error.
beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
})

test('TC-32 키가 없으면 규칙 추출로 같은 조건 카드가 보이고 응답이 이어진다', async ({ screen }) => {
  await send(screen, AROUND)
  await expectAroundCard(screen)
  await expect(screen.getByText('답변을 만들지 못했어요. 다시 시도해 주세요.')).not.toBeVisible()
})

test('TC-33 대역이 스키마에 맞지 않는 JSON을 주면 대체 경로로 같은 카드가 보이고 오류 원문은 없다', async ({ app, screen }) => {
  await api(app, '/api/test/llm', { task: TASK, mode: 'bad_json' })
  await send(screen, AROUND)
  await expectAroundCard(screen)
  for (const raw of ['the schema', '{"not"', 'ValidationError', 'Traceback']) {
    await expect(screen.getByText(raw)).not.toBeVisible()
  }
})
