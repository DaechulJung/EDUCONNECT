'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/kds/kds'
import type { Recommendation } from '@/lib/client'
import { FALLBACK_NOTE, recommendationCells, usesFallback } from '@/lib/recommend'

// 추천 비교표 (experience): kds-table from 768px, a card list below. Rows keep the server's order.
export function RecommendTable({ items }: { items: Recommendation[] }) {
  const wide = useWide()
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
            <tr>{header.map((h) => <th key={h} scope="col" className={h.startsWith('월') ? 'is-num' : undefined}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.program_id}>
                {recommendationCells(r).map((c) => (
                  <td key={c.label} className={c.label.startsWith('월') ? 'is-num' : undefined}>
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

const WIDE = '(min-width: 768px)'

function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}
