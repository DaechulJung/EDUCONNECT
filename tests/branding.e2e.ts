import { beforeEach, expect, test } from 'e2e'
import { resetSeed, signInParent } from './chat-support'

// REQ-12 in the browser (FLOW-01): TC-67 (AC-12.1), TC-68 (AC-12.2).
// TC-68 needs a synthetic AZURE_OPENAI_ENDPOINT in the environment *before* `docker compose up`
// (compose.yml hands it to the api container), so "host 0건" checks a value the app really holds.
// Never a real endpoint: the test refuses a host without "synthetic" and never prints the value.
// The test cannot read the container's value itself (AD-10: no printenv/inspect), so the run
// command in docs/e2e-test.md exports the value in the same shell before `up`, as CI's job env does.

const TITLE = 'EDUCONNECT · 모두의 AI 교육 에이전트'
const PROVIDER = 'Azure OpenAI(국내 리전)'

function syntheticHost(): string {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? ''
  expect(endpoint !== '', 'AZURE_OPENAI_ENDPOINT (synthetic) is set before the app starts').toBe(true)
  let host = ''
  try {
    host = new URL(endpoint).hostname
  } catch {
    // Node's URL error carries the raw input; swallow it so a failure never prints the value.
  }
  expect(host.includes('synthetic'), 'AZURE_OPENAI_ENDPOINT is a synthetic host').toBe(true)
  return host
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-67 시드 보호자 화면 머리에 "EDUCONNECT · 모두의 AI 교육 에이전트"와 연동 상태 "모의"가 보인다', async ({ app, screen }) => {
  await signInParent(app, screen)
  await expect(screen.getByRole('heading', TITLE)).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByText('모두의 AI 연동')).toBeVisible()
  await expect(screen.getByText('모의', { exact: true })).toBeVisible()
})

test('TC-68 챗봇 화면의 AI 공급자 표기가 "Azure OpenAI(국내 리전)"이고 화면과 /api/meta에 엔드포인트 호스트가 0건이다', async ({ app, screen, browser }) => {
  const host = syntheticHost()
  await signInParent(app, screen)
  await app.open('/chat')
  await expect(screen.getByLabel('챗봇에 보낼 말')).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByText(PROVIDER, { exact: true })).toBeVisible()

  // The whole document, attributes and scripts included, not only the visible text.
  const html = await browser.evaluate(() => document.documentElement.outerHTML)
  expect(html.includes(PROVIDER)).toBe(true)
  expect(html.includes(host), 'endpoint host in the chat page').toBe(false)

  const meta = await fetch(new URL('/api/meta', app.baseUrl))
  expect(meta.status).toBe(200)
  const body = await meta.text()
  expect(JSON.parse(body)).toEqual({
    service_name: 'EDUCONNECT',
    subtitle: '모두의 AI 교육 에이전트',
    modu_ai_status: 'mock',
    ai_provider_label: PROVIDER,
  })
  expect(body.includes(host), 'endpoint host in /api/meta').toBe(false)
})
