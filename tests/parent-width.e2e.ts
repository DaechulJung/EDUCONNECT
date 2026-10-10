import { expect, type App, type Screen } from 'e2e'
import { beforeEach, test, type Browser } from '@e2e-dev/web'
import { resetSeed, signInParent } from './chat-support'
import { makePlan, saveConditions, weekView } from './plan-support'
import { comparison, showRecommendations } from './recommend-support'
import { PARENT, PARENT_PC, PARENT_TABLET } from './viewport'

// Layout regression (defects after #6·#7·#8, 2026-10-10). experience Responsive: from 768px the parent screens
// sit in a centred frame of at most 748px, the comparison table is a table and the weekly plan a 7-column grid;
// below 768px they are cards and a per-day list. The first fix kept a 480px frame on every width and picked the
// shape from that frame, so a tablet or PC browser never showed the table (PR #27 Codex P2, 13:04Z decision).
// Before that, the tables were drawn inside 432px and clipped (.kds-table-wrap client 432 < scroll 613·779).

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

type Fit = {
  shape: string
  frame: number
  page: { client: number; scroll: number }
  box: { client: number; scroll: number }
  columns: number
  // Time ranges ("16:30~17:50") and amounts ("120,000원") that wrap onto more than one line.
  broken: string[]
} | null

// The visible element named `label`, the parent frame's width, the page's and the element's client/scroll width
// (a table is measured on its .kds-table-wrap), the table's column count, and the times and amounts that wrap.
// Hidden twins (a page kept after client navigation) have no client rects and are skipped.
async function fit(browser: Browser, label: string): Promise<Fit> {
  return browser.evaluate((name: string) => {
    const all = Array.from(document.querySelectorAll(`[aria-label="${name}"]`)) as HTMLElement[]
    const el = all.find((e) => e.getClientRects().length > 0)
    if (!el) return null
    const box = (el.tagName === 'TABLE' ? el.closest('.kds-table-wrap') : el) as HTMLElement
    const frame = (document.querySelector('header.kds-topnav')?.parentElement as HTMLElement | null)?.clientWidth ?? 0
    const broken: string[] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (const m of (n.textContent ?? '').matchAll(/\d\d:\d\d~\d\d:\d\d|[\d,]+원/g)) {
        const range = document.createRange()
        range.setStart(n, m.index ?? 0)
        range.setEnd(n, (m.index ?? 0) + m[0].length)
        const tops = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)))
        if (tops.size > 1) broken.push(m[0])
      }
    }
    return {
      shape: el.tagName.toLowerCase(),
      frame,
      page: { client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth },
      box: { client: box.clientWidth, scroll: box.scrollWidth },
      columns: el.tagName === 'TABLE' ? el.querySelectorAll('thead th').length : 0,
      broken,
    }
  }, label)
}

// 추천 비교표 → 일정 초안 → 확정 계획 at one viewport, each measured where it is shown.
async function measureParentViews(app: App, screen: Screen, browser: Browser) {
  await signInParent(app, screen)
  await app.open('/chat')
  await saveConditions(app, screen)

  const seen: Record<string, Fit> = {}
  await showRecommendations(screen)
  await expect(comparison(screen)).toBeVisible()
  seen['추천 비교표'] = await fit(browser, '추천 비교표')

  await makePlan(screen)
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
  seen['일정 초안'] = await fit(browser, '주간 일정표')

  await screen.getByRole('button', '일정 확정').tap()
  await screen.getByRole('dialog', '이 일정으로 확정할까요?').getByRole('button', '일정 확정').tap()
  await expect(screen.getByRole('region', '확정 계획')).toBeVisible({ timeout: 15_000 })
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
  seen['확정 계획'] = await fit(browser, '주간 일정표')
  return seen
}

// From 768px: frame ≤ 748, the comparison table (9 columns) and the weekly grid (7 columns) are tables, nothing
// scrolls sideways (page, table wrap) and no time range or amount wraps. One assertion at the end, so a single
// run prints every measurement (the values the PR comment quotes).
function expectWideViews(viewport: { width: number; height: number }, seen: Record<string, Fit>) {
  const report = JSON.stringify(seen)
  console.log(`parent-width ${viewport.width}×${viewport.height} ${report}`)
  const columns: Record<string, number> = { '추천 비교표': 9, '일정 초안': 7, '확정 계획': 7 }
  const wrong = Object.entries(seen).filter(([view, m]) =>
    !m || m.shape !== 'table' || m.columns !== columns[view] || m.frame > 748
    || m.page.scroll > m.page.client || m.box.scroll > m.box.client || m.broken.length > 0)
  expect(wrong.map(([view]) => view), `measurements ${report}`).toEqual([])
}

test('보호자 화면을 태블릿 폭(768×1024)으로 열면 748px 틀 안에 추천 비교표·주간 7열 격자가 넘치지 않고 시각·금액이 한 줄로 보인다', async ({ app, screen, browser }) => {
  await browser.setViewport(PARENT_TABLET)
  expectWideViews(PARENT_TABLET, await measureParentViews(app, screen, browser))
})

test('보호자 화면을 PC 폭(1440×900)으로 열면 가운데 748px 틀 안에 추천 비교표·주간 7열 격자가 넘치지 않고 시각·금액이 한 줄로 보인다', async ({ app, screen, browser }) => {
  await browser.setViewport(PARENT_PC)
  expectWideViews(PARENT_PC, await measureParentViews(app, screen, browser))
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
