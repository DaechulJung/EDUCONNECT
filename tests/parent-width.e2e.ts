import { expect, type Screen } from 'e2e'
import { beforeEach, test, type Browser } from '@e2e-dev/web'
import { resetSeed, signInParent } from './chat-support'
import { makePlan, saveConditions, weekView } from './plan-support'
import { comparison, showRecommendations } from './recommend-support'
import { PARENT, PARENT_PC } from './viewport'

// Layout regression (defect after #6·#7·#8, 2026-10-10): parent screens sit in a 480px phone frame on every
// browser width, so the comparison table, the plan draft and the confirmed plan must pick their shape from
// that frame, not from the viewport. At 1440×900 the old code drew the wide tables inside 432px and
// clipped them (.kds-table-wrap client 432 < scroll 613·779). The phone top bar must not clip its title.

beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await app.clearState()
})

type Fit = { shape: string; client: number; scroll: number } | null

// The visible element named `label` (a table is measured on its .kds-table-wrap) and its client/scroll width.
// Hidden twins (a page kept after client navigation) have no client rects and are skipped.
async function fit(browser: Browser, label: string): Promise<Fit> {
  return browser.evaluate((name: string) => {
    const all = Array.from(document.querySelectorAll(`[aria-label="${name}"]`)) as HTMLElement[]
    const el = all.find((e) => e.getClientRects().length > 0)
    if (!el) return null
    const box = (el.tagName === 'TABLE' ? el.closest('.kds-table-wrap') : el) as HTMLElement
    return { shape: el.tagName.toLowerCase(), client: box.clientWidth, scroll: box.scrollWidth }
  }, label)
}

// Measures one view and records it; the test asserts all three at the end so one run shows every overflow.
async function measure(browser: Browser, label: string, as: string, out: Record<string, Fit>) {
  const m = await fit(browser, label)
  expect(m, `${as} rendered`).not.toBeNull()
  out[as] = m
}

async function planView(screen: Screen) {
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
}

test('보호자 화면을 PC 폭(1440×900)으로 열어도 추천 비교표·일정 초안·확정 계획이 폰 틀 안에서 가로로 넘치지 않는다', async ({ app, screen, browser }) => {
  await browser.setViewport(PARENT_PC)
  await signInParent(app, screen)
  await app.open('/chat')
  await saveConditions(app, screen)

  const seen: Record<string, Fit> = {}
  await showRecommendations(screen)
  await expect(comparison(screen)).toBeVisible()
  await measure(browser, '추천 비교표', '추천 비교표', seen)

  await makePlan(screen)
  await planView(screen)
  await measure(browser, '주간 일정표', '일정 초안', seen)

  await screen.getByRole('button', '일정 확정').tap()
  await screen.getByRole('dialog', '이 일정으로 확정할까요?').getByRole('button', '일정 확정').tap()
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await planView(screen)
  await measure(browser, '주간 일정표', '확정 계획', seen)

  // The phone frame (480px) is narrower than the 768px table threshold, so every view is the card / per-day
  // list form, and nothing scrolls sideways. A wide table squeezed to fit (확정 계획: client = scroll 432,
  // one character per line) fails the shape check.
  const wrong = Object.entries(seen).filter(([, m]) => m!.shape === 'table' || m!.scroll > m!.client)
  expect(wrong, `shape and client/scroll widths ${JSON.stringify(seen)}`).toEqual([])
})

test('보호자 화면 390×844에서 상단 제목이 화면 위로 잘리지 않고 연동 상태 줄과 겹치지 않는다', async ({ app, screen, browser }) => {
  await browser.setViewport(PARENT)
  await signInParent(app, screen)
  await app.open('/chat')
  const title = screen.getByRole('heading', 'EDUCONNECT · 모두의 AI 교육 에이전트')
  await expect(title).toBeVisible({ timeout: 10_000 })
  const status = screen.getByText('모두의 AI 연동')
  await expect(status).toBeVisible()
  const t = await title.boundingBox()
  const s = await status.boundingBox()
  expect(t && s, 'title and status boxes').toBeTruthy()
  expect(t!.y, `title top ${JSON.stringify(t)}`).toBeGreaterThanOrEqual(0)
  expect(t!.y + t!.height, `title bottom ${JSON.stringify(t)} vs status ${JSON.stringify(s)}`).toBeLessThanOrEqual(s!.y)
})
