import { execFileSync } from 'node:child_process'
import { beforeEach, expect, test } from 'e2e'
import { resetSeed, signInParent } from './chat-support'

// REQ-12 in the browser (FLOW-01): TC-67 (AC-12.1), TC-68 (AC-12.2).
// TC-68 needs a synthetic AZURE_OPENAI_ENDPOINT in the environment *before* `docker compose up`
// (compose.yml hands it to the api container), so "host 0건" checks a value the app really holds.
// Never a real endpoint: the test refuses a host without "synthetic" and never prints the value.
// The host checked is the one the running api container holds (`docker compose exec api printenv`,
// same COMPOSE_PROJECT_NAME as `up`), so a runner value that differs from the app's fails the TC.

const TITLE = 'EDUCONNECT · 모두의 AI 교육 에이전트'
const PROVIDER = 'Azure OpenAI(국내 리전)'

function syntheticHost(): string {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? ''
  expect(endpoint !== '', 'AZURE_OPENAI_ENDPOINT (synthetic) is set before the app starts').toBe(true)
  const host = new URL(endpoint).hostname
  expect(host.includes('synthetic'), 'AZURE_OPENAI_ENDPOINT is a synthetic host').toBe(true)
  // Compared here, not printed: a failure must not show whatever host the container holds.
  expect(appHost() === host, 'the api container holds the same AZURE_OPENAI_ENDPOINT host as this runner').toBe(true)
  return host
}

function appHost(): string {
  let value = ''
  try {
    value = execFileSync('docker', ['compose', 'exec', '-T', 'api', 'printenv', 'AZURE_OPENAI_ENDPOINT'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return '' // unreadable: TC-68 runs against `docker compose up` from this folder
  }
  return value === '' ? '' : new URL(value).hostname
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
