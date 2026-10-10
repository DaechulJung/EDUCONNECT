'use client'

import { useState } from 'react'
import { ChipGroup, Sheet } from '@/components/kds/kds'
import type { Conditions } from '@/lib/client'
import { budgetError, DAY_OPTIONS, DENSITY_OPTIONS, shownDays, TYPE_OPTIONS } from '@/lib/conditions'

type Day = NonNullable<Conditions['days']>[number]
type ProgramType = NonNullable<Conditions['types']>[number]

// '고치기' bottom sheet (experience 조건 고치기). '적용' only changes the card; saving is separate.
export function ConditionSheet({ open, value, subjects, childId, childOptions, onApply, onClose }: {
  open: boolean
  value: Conditions
  subjects: string[]
  childId: string
  childOptions: { id: string; label: string }[]
  onApply: (next: Conditions, childId: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  const [target, setTarget] = useState(childId)
  const [opened, setOpened] = useState(open)
  if (open !== opened) {
    setOpened(open)
    if (open) {
      // each opening starts from the card's current values
      setDraft(value)
      setTarget(childId)
    }
  }
  const error = budgetError(draft)
  const money = (key: 'budget_target' | 'budget_cap') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    setDraft((d) => ({ ...d, [key]: digits ? Number(digits) : 0 }))
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="조건을 고쳐 주세요"
      footer={
        <>
          <button type="button" className="kds-button kds-button--secondary" onClick={onClose}>취소</button>
          <button type="button" className="kds-button" disabled={!!error} onClick={() => onApply(draft, target)}>적용</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <legend className="body-medium-semibold">대상 자녀</legend>
          {childOptions.map((c) => (
            <label key={c.id} className="kds-radio">
              <input type="radio" name="child" value={c.id} checked={target === c.id} onChange={() => setTarget(c.id)} /> {c.label}
            </label>
          ))}
        </fieldset>
        <div>
          <p className="body-medium-semibold" style={{ margin: 0 }}>선호 과목</p>
          <ChipGroup
            label="선호 과목"
            options={subjects.map((s) => ({ value: s }))}
            value={draft.subjects ?? []}
            onChange={(next) => setDraft((d) => ({ ...d, subjects: next }))}
          />
        </div>
        <label className="kds-field">
          <span className="kds-field__label">목표 월 예산(원)</span>
          <input className="kds-field__input" inputMode="numeric" value={draft.budget_target ? String(draft.budget_target) : ''} onChange={money('budget_target')} />
        </label>
        <label className={error ? 'kds-field kds-field--error' : 'kds-field'}>
          <span className="kds-field__label">예산 상한(원)</span>
          <input
            className="kds-field__input"
            inputMode="numeric"
            value={draft.budget_cap ? String(draft.budget_cap) : ''}
            onChange={money('budget_cap')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'budget-error' : undefined}
          />
          {error && <span className="kds-field__helper" id="budget-error">{error}</span>}
        </label>
        <div>
          <p className="body-medium-semibold" style={{ margin: 0 }}>학원 유형</p>
          <ChipGroup
            label="학원 유형"
            options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={draft.types ?? []}
            onChange={(next) => setDraft((d) => ({ ...d, types: next as ProgramType[] }))}
          />
        </div>
        <div>
          <p className="body-medium-semibold" style={{ margin: 0 }}>가능 요일</p>
          <ChipGroup
            label="가능 요일"
            options={DAY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={[...shownDays(draft.days ?? [])]}
            onChange={(next) => setDraft((d) => ({ ...d, days: next as Day[] }))}
          />
        </div>
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <legend className="body-medium-semibold">밀도</legend>
          {DENSITY_OPTIONS.map((o) => (
            <label key={o.value} className="kds-radio">
              <input
                type="radio"
                name="density"
                value={o.value}
                checked={(draft.density ?? 'normal') === o.value}
                onChange={() => setDraft((d) => ({ ...d, density: o.value }))}
              />{' '}
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>
    </Sheet>
  )
}
