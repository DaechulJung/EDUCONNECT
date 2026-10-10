'use client'

import { Icon } from '@/components/kds/kds'
import type { Recommendation } from '@/lib/client'
import { FALLBACK_NOTE, recommendationCells, usesFallback } from '@/lib/recommend'
import { useWideViewport } from '@/lib/use-wide-viewport'

// 추천 비교표 (experience): kds-table from a 768px viewport (inside the 748px parent frame), a card list below.
// Rows keep the server's order.
// Nine columns share the 748px frame (708px of table): cells take half the kit's side padding, and time ranges and
// amounts never wrap ("16:30~17:50" on one line); names and 추천 이유 wrap instead.
const CELL = { paddingInline: 'var(--space-8)' }
const ONE_LINE = { ...CELL, whiteSpace: 'nowrap' } as const
const oneLine = (label: string) => label === '시간' || label.startsWith('월')

export function RecommendTable({ items }: { items: Recommendation[] }) {
  const wide = useWideViewport()
  const fallback = usesFallback(items)
  if (items.length === 0) {
    return (
      <div className="kds-empty" aria-label="추천 비교표">
        <Icon name="ic-line-info" />
        <p>조건에 맞는 프로그램이 없어요. 조건을 고쳐 다시 추천을 받아 보세요.</p>
      </div>
    )
  }
  const note = fallback && <span className="caption-medium-medium" style={{ display: 'block', color: 'var(--text-tertiary-01)' }}>{FALLBACK_NOTE}</span>
  if (wide) {
    const header = recommendationCells(items[0]).map((c) => c.label)
    return (
      <div className="kds-table-wrap">
        <table className="kds-table" aria-label="추천 비교표">
          <thead>
            <tr>{header.map((h) => <th key={h} scope="col" className={h.startsWith('월') ? 'is-num' : undefined} style={CELL}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.program_id}>
                {recommendationCells(r).map((c) => (
                  <td key={c.label} className={c.label.startsWith('월') ? 'is-num' : undefined} style={oneLine(c.label) ? ONE_LINE : CELL}>
                    {c.value}
                    {c.label === '추천 이유' && note}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <ul aria-label="추천 비교표" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {items.map((r) => (
        <li key={r.program_id} className="kds-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {recommendationCells(r).map((c) => (
            <div key={c.label} className="kds-kv body-small-medium" role="group" aria-label={c.label}>
              <span className="kds-kv__label">{c.label}</span>
              <span className="kds-kv__value">{c.value}{c.label === '추천 이유' && note}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}
