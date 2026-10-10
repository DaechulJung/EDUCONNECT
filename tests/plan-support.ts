import { expect, type App, type Locator, type Screen } from 'e2e'
import { AROUND, TASK, api, send } from './chat-support'

// Shared steps for the schedule TCs (REQ-07 schedule.e2e.ts, REQ-08 plan.e2e.ts).
// Plans are never pinned: tests read what the server generated from the seed.
export const AROUND_REPLY = { subjects: ['영어', '수학'], budget_amount: 1_000_000, budget_mode: 'around', types: [], days: [], density: 'tight' }
export const DAYS = ['월', '화', '수', '목', '금', '토', '일']

// AC-05.1 card (초5, 영어·수학, 1,000,000 전후 → 상한 1,100,000), optionally edited, then saved.
export async function saveConditions(app: App, screen: Screen, edit?: (sheet: Locator) => Promise<void>) {
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '예산 상한')).toContainText('1,100,000원', { timeout: 15_000 })
  if (edit) {
    await screen.getByRole('article', '조건 카드').getByRole('button', '고치기').tap()
    const sheet = screen.getByRole('dialog', '조건을 고쳐 주세요')
    await edit(sheet)
    await sheet.getByRole('button', '적용').tap()
  }
  await screen.getByRole('button', '조건 저장').tap()
  await expect(screen.getByText('조건을 저장했어요').first()).toBeVisible({ timeout: 10_000 })
}

export async function makePlan(screen: Screen) {
  await screen.getByRole('button', '일정 만들기').tap()
}

export const won = (text: string) => Number(text.replace(/[^\d]/g, ''))
export const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

export async function monthlyTotal(screen: Screen): Promise<number> {
  const group = screen.getByRole('group', '월 학원비')
  await expect(group).toBeVisible({ timeout: 15_000 })
  return won((await group.textContent()) ?? '')
}

// 주간 일정표 in either shape (experience): a per-day list (role=group, one section per day) in the parent
// phone frame, a Monday-first table in a wide frame. Both carry the name "주간 일정표" and the same
// "<요일> 학교" / "<요일> 수업" list items, so the days are read the same way.
export function weekView(screen: Screen): Locator {
  return screen.getByLabel('주간 일정표', { exact: true, visible: true })
}

// Every class and the school block per day (Monday first).
export async function week(screen: Screen): Promise<{ day: string; school: string | null; classes: { subject: string; start: string; end: string; text: string }[] }[]> {
  const view = weekView(screen)
  await expect(view).toBeVisible({ timeout: 15_000 })
  const table = screen.getByRole('table', '주간 일정표', { visible: true })
  const days = (await table.count()) > 0
    ? await table.getByRole('columnheader').allTextContents()
    : (await view.getByRole('heading').allTextContents()).map((h) => h.replace(/요일$/, ''))
  expect(days.map((d) => d.trim())).toEqual(DAYS)
  const out = []
  for (const day of DAYS) {
    const school = await view.getByRole('listitem', `${day} 학교`).allTextContents()
    const classes = []
    // One read per day: the draft re-renders when the server's answer lands, so held nodes can go stale.
    for (const text of await view.getByRole('listitem', `${day} 수업`).allTextContents()) {
      const [, start, end] = text.match(/(\d\d:\d\d)~(\d\d:\d\d)/) ?? []
      // The entry starts with the subject; institution names like 새봄영어수학학원 hold both words.
      classes.push({ subject: text.trim().startsWith('영어') ? '영어' : text.trim().startsWith('수학') ? '수학' : text, start, end, text })
    }
    out.push({ day, school: school[0]?.match(/~(\d\d:\d\d)/)?.[1] ?? null, classes })
  }
  return out
}
