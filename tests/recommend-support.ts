import { expect, type Locator, type Screen } from 'e2e'

// 추천 비교표 in either shape (experience: kds-table in a wide frame, a card list in the parent phone frame).
// Both carry the accessible name "추천 비교표"; cards hold one labelled group per column.
export const COLUMNS = ['학원명', '과목', '유형', '요일', '시간', '월 교습비', '월 기타경비', '이동', '추천 이유']

export function comparison(screen: Screen): Locator {
  return screen.getByLabel('추천 비교표', { exact: true, visible: true })
}

export async function showRecommendations(screen: Screen): Promise<Locator> {
  await screen.getByRole('button', '추천 보기').tap()
  const view = comparison(screen)
  await expect(view).toBeVisible({ timeout: 15_000 })
  return view
}

// Column names in screen order and the values of every row (table row or card), by column name.
export async function readComparison(screen: Screen): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const table = screen.getByRole('table', '추천 비교표', { visible: true })
  if ((await table.count()) > 0) {
    const columns = (await table.getByRole('columnheader').allTextContents()).map((h) => h.trim())
    const rows: Record<string, string>[] = []
    for (const r of await table.getByRole('row').all()) {
      const cells = await r.getByRole('cell').allTextContents()
      if (cells.length) rows.push(Object.fromEntries(columns.map((h, i) => [h, cells[i].trim()])))
    }
    return { columns, rows }
  }
  const cards = screen.getByRole('list', '추천 비교표', { visible: true }).getByRole('listitem')
  let columns: string[] = []
  const rows: Record<string, string>[] = []
  for (const card of await cards.all()) {
    // One read per card; each group's text is "<label><value>".
    const row: Record<string, string> = {}
    const order: string[] = []
    for (const text of await card.getByRole('group').allTextContents()) {
      const t = text.trim()
      const label = COLUMNS.filter((c) => t.startsWith(c)).sort((a, b) => b.length - a.length)[0]
      expect(label, `card field "${t}"`).toBeTruthy()
      order.push(label)
      row[label] = t.slice(label.length).trim()
    }
    if (!columns.length) columns = order
    rows.push(row)
  }
  return { columns, rows }
}

export async function rows(screen: Screen): Promise<Record<string, string>[]> {
  return (await readComparison(screen)).rows
}
