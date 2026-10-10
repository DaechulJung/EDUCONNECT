import { beforeEach, expect, test } from 'e2e'
import { AROUND, resetSeed, row, send, signInParent } from './chat-support'

// TC-34 (AC-05.7): real Azure OpenAI. Tagged ai, so CI skips it (`--exclude-tag ai`).
// Start the app with the key file outside the repository and LLM_PROVIDER=azure (or auto with keys).
beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await signInParent(app, screen)
  await app.open('/chat')
})

// source "llm" means the model reply passed the server's schema check; a failure would fall back.
async function chatSource(baseUrl: string) {
  const at = (path: string) => new URL(path, baseUrl)
  const login = await fetch(at('/api/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: 'parent1', password: process.env.SEED_PASSWORD }),
  })
  expect(login.status).toBe(200)
  const cookie = login.headers.get('set-cookie')!.split(';')[0]
  const children = await (await fetch(at('/api/children'), { headers: { cookie } })).json()
  const reply = await fetch(at('/api/chat/messages'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ child_id: children[0].id, text: AROUND }),
  })
  expect(reply.status).toBe(200)
  return reply.json()
}

test('TC-34 실제 Azure OpenAI 응답이 스키마 검증을 통과하고 조건 카드에 영어·수학, 목표 1,000,000원이 보인다', { tags: ['ai'], timeout: 90_000 }, async ({ app, screen }) => {
  const body = await chatSource(app.baseUrl)
  expect(body.source).toBe('llm')
  expect(body.conditions.subjects).toEqual(expect.arrayContaining(['영어', '수학']))
  expect(body.conditions.budget_target).toBe(1_000_000)

  await send(screen, AROUND)
  await expect(row(screen, '선호 과목')).toContainText('영어·수학', { timeout: 45_000 })
  await expect(row(screen, '목표 월 예산')).toContainText('1,000,000원')
})
