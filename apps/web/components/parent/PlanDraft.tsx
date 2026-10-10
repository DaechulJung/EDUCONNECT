'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/kds/kds'
import type { Plan } from '@/lib/client'
import { formatWon } from '@/lib/conditions'
import { NO_PLAN, itemMonthly, overBudget, relaxationLabels, weekColumns, type DayEntry } from '@/lib/plan'

// 일정 초안 (experience): weekly table from 768px, per-day list below, then the monthly cost summary.
// Removing, swapping and confirming arrive with #8; this shows the server's draft as is.
export function PlanDraft({ plan }: { plan: Plan }) {
  const wide = useWide()
  const columns = weekColumns(plan)
  return (
    <section aria-label="일정 초안" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
      {wide ? (
        <div className="kds-table-wrap">
          <table className="kds-table" aria-label="주간 일정표">
            <thead>
              <tr>{columns.map((c) => <th key={c.day} scope="col">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((c) => (
                  <td key={c.day} style={{ verticalAlign: 'top' }}>
                    <Entries entries={c.entries} day={c.label} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div aria-label="주간 일정표" role="group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          {columns.map((c) => (
            <section key={c.day} aria-label={`${c.label}요일`}>
              <h4 className="body-medium-bold" style={{ margin: 0 }}>{c.label}요일</h4>
              <Entries entries={c.entries} day={c.label} />
            </section>
          ))}
        </div>
      )}
      <Summary plan={plan} />
    </section>
  )
}

function Entries({ entries, day }: { entries: DayEntry[]; day: string }) {
  if (entries.length === 0) return <p className="caption-medium-medium" style={{ margin: 0, color: 'var(--text-tertiary-01)' }}>일정 없음</p>
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {entries.map((e) =>
        e.kind === 'school' ? (
          <li key="school" aria-label={`${day} 학교`} className="caption-medium-medium" style={{ background: 'var(--surface-primary-02)', borderRadius: 'var(--radius-8)', padding: 'var(--space-8)', color: 'var(--text-secondary-01)' }}>
            학교 ~{e.end}
          </li>
        ) : (
          <li key={e.item.program_id} aria-label={`${day} 수업`} className="caption-medium-medium" style={{ border: '1px solid var(--border-secondary-01)', borderRadius: 'var(--radius-8)', padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <span className="body-small-bold">{e.item.subject}</span>
            <span>{e.item.institution_name}</span>
            <span style={{ color: 'var(--text-secondary-01)' }}>{e.item.start}~{e.item.end}</span>
            {e.violations.map((v) => (
              <span key={v} className="kds-tag kds-tag--critical"><Icon name="ic-line-warning" size={16} />{v}</span>
            ))}
          </li>
        ),
      )}
    </ul>
  )
}

function Summary({ plan }: { plan: Plan }) {
  const over = overBudget(plan)
  return (
    <div className="kds-card" aria-label="월 학원비 요약" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div className="kds-kv body-medium-bold" role="group" aria-label="월 학원비">
        <span className="kds-kv__label">월 학원비</span>
        <span className="kds-kv__value">{formatWon(plan.monthly_total)}</span>
      </div>
      <div className="kds-kv body-small-medium" role="group" aria-label="예산 상한">
        <span className="kds-kv__label">예산 상한</span>
        <span className="kds-kv__value">{formatWon(plan.budget_cap)}</span>
      </div>
      {over && <span className="kds-tag kds-tag--critical" style={{ alignSelf: 'flex-start' }}><Icon name="ic-line-warning" size={16} />{over}</span>}
      <details>
        <summary className="body-small-medium">프로그램별 내역</summary>
        <ul aria-label="월 학원비 내역" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {plan.items.map((i) => (
            <li key={i.program_id} className="kds-kv caption-medium-medium" aria-label={`${i.institution_name} ${i.subject}`}>
              <span className="kds-kv__label">{i.institution_name} {i.subject}</span>
              <span className="kds-kv__value">{formatWon(i.monthly_tuition)} + {formatWon(i.monthly_other)} = {formatWon(itemMonthly(i))}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// 조건 불만족 (experience): no draft, the relaxations the server found, and a way back to the card.
export function NoPlan({ relaxations, onEdit }: { relaxations: string[]; onEdit: () => void }) {
  return (
    <div className="kds-empty" aria-label="일정 초안">
      <Icon name="ic-line-info" />
      <p>{NO_PLAN}</p>
      <ul aria-label="완화할 조건" style={{ margin: 0, paddingLeft: 'var(--space-16)', textAlign: 'left' }}>
        {relaxationLabels(relaxations).map((r) => <li key={r} className="body-small-medium">{r}</li>)}
      </ul>
      <button type="button" className="kds-button kds-button--secondary kds-button--small" onClick={onEdit}>조건 고치기</button>
    </div>
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
