import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect } from 'e2e'
import { beforeEach, test, type Browser } from '@e2e-dev/web'
import { AROUND, TASK, api, resetSeed, signInParent } from './chat-support'
import { makePlan, saveConditions } from './plan-support'

// REQ-13: TC-69 (AC-13.1) axe on the five screens, TC-70 (AC-13.2) keyboard-only flow and sheet/popup focus.
// The app must run with ENABLE_TEST_ROUTES=1, LLM_PROVIDER=fake and the seed password in SEED_PASSWORD.
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }

beforeEach(async ({ app }) => {
  await resetSeed(app)
})

type Violation = { id: string; impact: string | null; targets: string[] }

// Injects axe-core into the current document and returns the violations of the WCAG A/AA rules up to 2.2 AA.
async function axeViolations(browser: Browser): Promise<Violation[]> {
  await browser.evaluate(`(function () { ${AXE_SOURCE}\n return null })()`)
  return browser.evaluate(
    `axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(AXE_TAGS)} } })
      .then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(' ')) })))`,
  )
}

async function expectNoViolations(browser: Browser, label: string) {
  const violations = await axeViolations(browser)
  expect(violations, `${label}: ${JSON.stringify(violations)}`).toEqual([])
}

async function signIn(app: Parameters<typeof signInParent>[0], screen: Parameters<typeof signInParent>[1], loginId: string, heading: string) {
  await app.open('/login')
  await screen.getByLabel('아이디').fill(loginId)
  await screen.getByLabel('비밀번호').fill(process.env.SEED_PASSWORD!)
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', heading)).toBeVisible({ timeout: 10_000 })
}

test('TC-69 보호자 챗봇·일정·자녀 화면과 학원·학교 관리 화면에서 axe(WCAG 2.2 AA) 위반이 0건이다', async ({ app, screen, browser }) => {
  await signInParent(app, screen)
  for (const path of ['/chat', '/schedule', '/children']) {
    await app.open(path)
    await expect(screen.getByRole('navigation')).toBeVisible({ timeout: 15_000 })
    await expectNoViolations(browser, `보호자 ${path}`)
  }
  await resetSeed(app)
  await signIn(app, screen, 'academy-a', '학원 프로그램 관리')
  await expectNoViolations(browser, '학원 프로그램 관리')
  await resetSeed(app)
  await signIn(app, screen, 'school-elem', '학교 시간표 관리')
  await expect(screen.getByRole('tab', '5학년')).toBeVisible({ timeout: 10_000 })
  await expectNoViolations(browser, '학교 시간표 관리')
})

test('TC-69 조건 카드·일정 초안·확정 계획이 있는 보호자 화면에서도 axe 위반이 0건이다', async ({ app, screen, browser }) => {
  await signInParent(app, screen)
  await app.open('/chat')
  await saveConditions(app, screen)
  await expectNoViolations(browser, '챗봇 조건 카드')
  await makePlan(screen)
  await expect(screen.getByRole('table', '주간 일정표')).toBeVisible({ timeout: 15_000 })
  await expectNoViolations(browser, '챗봇 일정 초안')
  await screen.getByRole('button', '일정 확정').tap()
  await screen.getByRole('dialog', '이 일정으로 확정할까요?').getByRole('button', '일정 확정').tap()
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await expectNoViolations(browser, '확정 계획')
  await app.open('/schedule')
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await expectNoViolations(browser, '일정 탭 확정 계획')
})

type Focus = { name: string; tag: string; visible: boolean; inDialog: boolean }

// The focused element: its accessible name, and whether a focus indicator (outline or box-shadow; a wrapper's outline counts) is drawn.
const readFocus = (browser: Browser): Promise<Focus> =>
  browser.evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { name: '', tag: 'body', visible: false, inDialog: false }
    const labelled = el.labels && el.labels[0] ? el.labels[0].textContent : ''
    const drawn = (node, withShadow) => {
      const style = getComputedStyle(node)
      return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || (withShadow && style.boxShadow !== 'none')
    }
    // The element itself, or the field wrapper that shows focus through :has(input:focus-visible) (KDS prompt dock, search).
    const visible = drawn(el, true) || drawn(el.parentElement, false)
    const name = (el.getAttribute('aria-label') || labelled || el.textContent || '').trim()
    return { name, tag: el.tagName.toLowerCase(), visible, inDialog: !!el.closest('[role="dialog"]') }
  })()`)

// Tab until the focused element's name matches, up to `limit` presses; every stop on the way must draw a focus indicator.
async function tabTo(browser: Browser, name: string | RegExp, limit = 60): Promise<Focus> {
  const seen: string[] = []
  for (let i = 0; i < limit; i++) {
    await browser.keyboard.press('Tab')
    const focus = await readFocus(browser)
    seen.push(focus.name)
    if (focus.tag === 'body') continue // focus left the page (first press or end of the document); the next Tab re-enters it
    expect(focus.visible, `포커스 표시 없음: ${focus.tag} "${focus.name}" (지나온 순서: ${seen.join(' | ')})`).toBe(true)
    if (typeof name === 'string' ? focus.name === name : name.test(focus.name)) return focus
  }
  throw new Error(`Tab ${limit}번 안에 "${name}"에 닿지 않음: ${seen.join(' | ')}`)
}

test('TC-70 키보드만으로 로그인→챗봇 조건 입력→조건 저장→일정 만들기→일정 확정까지 가고 단계마다 포커스 표시가 보인다', async ({ app, screen, browser }) => {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await app.open('/login')
  await expect(screen.getByRole('heading', '로그인')).toBeVisible()

  await tabTo(browser, '아이디')
  await browser.keyboard.type('parent1')
  await tabTo(browser, '비밀번호')
  await browser.keyboard.type(process.env.SEED_PASSWORD!)
  await tabTo(browser, '로그인')
  await browser.keyboard.press('Enter')
  await expect(screen.getByRole('heading', '로그인')).not.toBeVisible({ timeout: 10_000 })
  await app.open('/chat')

  await tabTo(browser, '챗봇에 보낼 말')
  await browser.keyboard.type(AROUND)
  await tabTo(browser, '보내기')
  await browser.keyboard.press('Enter')
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })

  await tabTo(browser, '조건 저장')
  await browser.keyboard.press('Enter')
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })

  await tabTo(browser, '일정 만들기')
  await browser.keyboard.press('Enter')
  await expect(screen.getByRole('table', '주간 일정표')).toBeVisible({ timeout: 15_000 })

  await tabTo(browser, '일정 확정')
  await browser.keyboard.press('Enter')
  const dialog = screen.getByRole('dialog', '이 일정으로 확정할까요?')
  await expect(dialog).toBeVisible()
  const inside = await readFocus(browser)
  expect(inside.inDialog, `확정 팝업을 열면 포커스가 안으로: ${inside.name}`).toBe(true)
  await tabTo(browser, '일정 확정')
  await browser.keyboard.press('Enter')
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
})

test('TC-70 시트·팝업: 열면 안으로 포커스가 가고 Tab은 안에서만 돌며 Escape로 닫히고 연 버튼으로 돌아온다', async ({ app, screen, browser }) => {
  await signInParent(app, screen)
  await app.open('/chat')
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await screen.getByLabel('챗봇에 보낼 말').fill(AROUND)
  await screen.getByRole('button', '보내기').tap()
  await expect(screen.getByRole('article', '조건 카드')).toBeVisible({ timeout: 15_000 })

  const opener = await tabTo(browser, '고치기')
  await browser.keyboard.press('Enter')
  await expect(screen.getByRole('dialog', '조건을 고쳐 주세요')).toBeVisible()
  expect((await readFocus(browser)).inDialog, '시트를 열면 포커스가 안으로').toBe(true)
  for (let i = 0; i < 40; i++) {
    await browser.keyboard.press('Tab')
    expect((await readFocus(browser)).inDialog, `Tab ${i + 1}번째에 포커스가 시트 밖으로`).toBe(true)
  }
  await browser.keyboard.press('Escape')
  await expect(screen.getByRole('dialog', '조건을 고쳐 주세요')).not.toBeVisible()
  const back = await readFocus(browser)
  expect(back.name, '닫으면 연 버튼으로').toBe(opener.name)
  expect(back.tag).toBe('button')
})
