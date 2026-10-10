'use client'

import { Icon } from '@/components/kds/kds'
import type { Plan, PlanItem } from '@/lib/client'
import { formatWon } from '@/lib/conditions'
import { NO_PLAN, canConfirm, confirmNotice, itemBreakdown, overBudget, relaxationLabels, weekColumns, type DayEntry } from '@/lib/plan'
import { useWideViewport } from '@/lib/use-wide-viewport'

// Draft edits (#8): '빼기'·'바꾸기' change the draft in place, '일정 확정' asks first (experience 112행).
export type PlanActions = {
  busy: boolean
  onRemove: (item: PlanItem) => void
  onSwap: (item: PlanItem) => void
  onConfirm: () => void
  // Programs the server refused on the last confirm (422 unknown_program); cleared when the draft changes.
  unavailable?: string[]
}

// 일정 초안 (experience): 7-column weekly grid from a 768px viewport (inside the 748px parent frame), per-day list
// below, then the monthly cost summary. Without actions it is read-only (확정 계획 on the 일정 탭).
export function PlanDraft({ plan, actions, label = '일정 초안' }: { plan: Plan; actions?: PlanActions; label?: string }) {
  const wide = useWideViewport()
  const unavailable = actions?.unavailable ?? []
  const columns = weekColumns(plan, unavailable)
  const confirmable = canConfirm(plan, unavailable)
  const notice = confirmNotice(plan, unavailable)
  const single = plan.items.length <= 1
  return (
    <section aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', minWidth: 0 }}>
      {wide ? (
        <div className="kds-table-wrap">
          <table className="kds-table" aria-label="주간 일정표">
            <thead>
              <tr>{columns.map((c) => <th key={c.day} scope="col" style={GRID_CELL}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((c) => (
                  <td key={c.day} style={{ ...GRID_CELL, verticalAlign: 'top' }}>
                    <Entries entries={c.entries} day={c.label} actions={actions} single={single} />
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
              <Entries entries={c.entries} day={c.label} actions={actions} single={single} />
            </section>
          ))}
        </div>
      )}
      <Summary plan={plan} />
      {actions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {notice && <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{notice}</p>}
          <button type="button" className="kds-button" disabled={!confirmable || actions.busy} onClick={actions.onConfirm}>일정 확정</button>
        </div>
      )}
    </section>
  )
}

// Seven day columns share the 748px frame (708px of grid, about 100px each): the grid cells keep a small side
// padding, a class's time stays on one line and its 빼기·바꾸기 buttons wrap under each other when narrow.
const GRID_CELL = { paddingInline: 'var(--space-4)' }

function Entries({ entries, day, actions, single }: { entries: DayEntry[]; day: string; actions?: PlanActions; single: boolean }) {
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
            <span style={{ color: 'var(--text-secondary-01)', whiteSpace: 'nowrap' }}>{e.item.start}~{e.item.end}</span>
            {e.violations.map((v) => (
              <span key={v} className="kds-tag kds-tag--critical"><Icon name="ic-line-warning" size={16} />{v}</span>
            ))}
            {actions && (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <button type="button" className="kds-button kds-button--tertiary kds-button--xsmall" aria-label={`${e.item.institution_name} ${e.item.subject} 빼기`} disabled={actions.busy || single} onClick={() => actions.onRemove(e.item)}>빼기</button>
                <button type="button" className="kds-button kds-button--tertiary kds-button--xsmall" aria-label={`${e.item.institution_name} ${e.item.subject} 바꾸기`} disabled={actions.busy} onClick={() => actions.onSwap(e.item)}>바꾸기</button>
              </span>
            )}
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
              <span className="kds-kv__value">{itemBreakdown(i)}</span>
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
