import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, expect, test } from 'e2e'
import { resetSeed, signInParent } from './chat-support'
import { makePlan, monthlyTotal, saveConditions } from './plan-support'

// REQ-10 (FLOW-01): TC-57 (AC-10.1). Synthetic AZURE_OPENAI_* values must be in the runner's environment
// *before* `docker compose up` (compose.yml hands them to the api container) — the run command in
// docs/e2e-test.md exports them in the same shell, as CI's job env does. The test then
//   ① builds the web app with those values in the build environment and searches the build output, and
//   ② runs FLOW-01 in the browser and searches every response the browser received.
// Never a real value: the test refuses any value without "synthetic" and never prints one.

const NAMES = ['AZURE_OPENAI_LOCATION', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_BASE_URL', 'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_DEPLOYMENT']
const ROOT = join(import.meta.dirname, '..')
const WEB = join(ROOT, 'apps', 'web')

function syntheticValues(): Record<string, string> {
  const values: Record<string, string> = {}
  for (const name of NAMES) {
    const value = process.env[name] ?? ''
    expect(value !== '', `${name} (synthetic) is set before the app starts`).toBe(true)
    expect(value.includes('synthetic'), `${name} is a synthetic value`).toBe(true)
    values[name] = value
  }
  // The host is what a page would most likely leak, so it is searched on its own as well.
  for (const name of ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_BASE_URL']) {
    try {
      values[`${name} host`] = new URL(values[name]).hostname
    } catch {
      // Node's URL error carries the raw input; swallow it so a failure never prints the value.
    }
  }
  return values
}

// Names of the values found in text; never the values themselves.
function found(text: string, values: Record<string, string>): string[] {
  return Object.entries(values).filter(([, value]) => text.includes(value)).map(([name]) => name)
}

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-57 가짜 AZURE_OPENAI_* 값을 넣고 빌드한 웹 산출물과 FLOW-01 중 브라우저가 받은 모든 응답에 그 값이 0건이다', { timeout: 300_000 }, async ({ app, screen, browser }) => {
  const values = syntheticValues()

  // ① Build with the values in the build environment, then search everything the build wrote.
  const build = spawnSync('npm', ['run', 'build', '-w', 'web'], {
    cwd: ROOT,
    env: { ...process.env, ...Object.fromEntries(NAMES.map((name) => [name, values[name]])), NEXT_TELEMETRY_DISABLED: '1' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  expect(build.status, 'web build with synthetic AZURE_OPENAI_* exits 0').toBe(0)
  expect(found(`${build.stdout}${build.stderr}`, values), 'values in the build log').toEqual([])
  const output = files(join(WEB, '.next'))
  expect(output.length, 'build output files').toBeGreaterThan(0)
  const inOutput = output.flatMap((file) => found(readFileSync(file).toString('latin1'), values).map((name) => `${name} in ${file.slice(WEB.length)}`))
  expect(inOutput, 'values in the build output').toEqual([])

  // ② Every fetch/XHR body is searched in the page as it arrives (POST bodies cannot be fetched again);
  // documents, scripts, styles and other GETs are fetched again below with the browser's cookies.
  await browser.addInitScript((needles: string[]) => {
    const KEY = 'tc57'
    const state = () => JSON.parse(sessionStorage.getItem(KEY) ?? '{"bodies":0,"hits":0,"urls":[]}')
    const save = (s: unknown) => sessionStorage.setItem(KEY, JSON.stringify(s))
    const note = (text: string) => {
      const s = state()
      s.bodies += 1
      if (needles.some((needle) => text.includes(needle))) s.hits += 1
      save(s)
    }
    const keepUrls = () => {
      const s = state()
      const urls = new Set<string>(s.urls)
      for (const entry of performance.getEntries()) if ('name' in entry && /^https?:/.test(entry.name)) urls.add(entry.name)
      urls.add(location.href)
      s.urls = [...urls]
      save(s)
    }
    const fetch0 = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await fetch0(...args)
      response.clone().text().then(note, () => {})
      return response
    }
    const send0 = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.send = function (...args: Parameters<XMLHttpRequest['send']>) {
      this.addEventListener('loadend', () => note(typeof this.response === 'string' ? this.response : ''))
      return send0.apply(this, args)
    }
    addEventListener('pagehide', keepUrls)
    setInterval(keepUrls, 500)
  }, Object.values(values))

  // FLOW-01: 로그인 → 챗봇 조건 → 추천 비교표 → 일정 생성 → 확정 → 일정 탭.
  await signInParent(app, screen)
  await app.open('/chat')
  await saveConditions(app, screen)
  await screen.getByRole('button', '추천 보기').tap()
  await expect(screen.getByRole('table', '추천 비교표')).toBeVisible({ timeout: 15_000 })
  await makePlan(screen)
  expect(await monthlyTotal(screen)).toBeGreaterThan(0)
  await screen.getByRole('button', '일정 확정').tap()
  await screen.getByRole('dialog', '이 일정으로 확정할까요?').getByRole('button', '일정 확정').tap()
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await app.open('/schedule')
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await new Promise((resolve) => setTimeout(resolve, 600))

  const seen = (await browser.evaluate(() => JSON.parse(sessionStorage.getItem('tc57') ?? '{}'))) as { bodies: number; hits: number; urls: string[] }
  expect(seen.bodies, 'fetch/XHR bodies searched in the page (a scan of nothing would pass)').toBeGreaterThan(5)
  expect(seen.hits, 'fetch/XHR bodies holding a value').toBe(0)

  const origin = new URL(app.baseUrl).origin
  const cookie = (await browser.cookies()).map((c) => `${c.name}=${c.value}`).join('; ')
  const gets = seen.urls.filter((url) => url.startsWith(origin))
  expect(gets.length, 'documents and assets fetched again').toBeGreaterThan(5)
  const inResponses: string[] = []
  for (const url of gets) {
    const response = await fetch(url, { headers: { cookie } })
    const text = Buffer.from(await response.arrayBuffer()).toString('latin1')
    inResponses.push(...found(text, values).map((name) => `${name} in ${new URL(url).pathname}`))
  }
  expect(inResponses, 'values in documents and assets').toEqual([])
  expect(gets.some((url) => new URL(url).pathname === '/chat'), 'the chat document was searched').toBe(true)
})
