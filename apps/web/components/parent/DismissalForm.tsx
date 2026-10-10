'use client'

import { useState } from 'react'
import { Icon } from '@/components/kds/kds'
import { DISMISSAL_DAYS, EMPTY_DISMISSAL, NO_TIMETABLE, dismissalComplete, type Dismissal } from '@/lib/dismissal'

// AC-04.5: shown under the condition card when the draft answer is 422 `school_timetable_missing`.
export function DismissalForm({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (value: Dismissal) => void }) {
  const [value, setValue] = useState<Dismissal>(EMPTY_DISMISSAL)
  const complete = dismissalComplete(value)
  return (
    <form
      aria-label="하교 시각 입력"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}
      onSubmit={(e) => {
        e.preventDefault()
        if (complete) onSubmit(value)
      }}
    >
      <div className="kds-notice" role="status">
        <div><p className="kds-notice__body">{NO_TIMETABLE}</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-8)' }}>
        {DISMISSAL_DAYS.map((d) => (
          <label key={d.value} className="kds-field">
            <span className="kds-field__label">{d.label}</span>
            <input className="kds-field__input" type="time" required value={value[d.value]} onChange={(e) => setValue({ ...value, [d.value]: e.target.value })} />
          </label>
        ))}
      </div>
      {error && <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{error}</p>}
      <button type="submit" className="kds-button" disabled={!complete || busy}>
        {busy ? '처리하고 있어요' : '하교 시각 저장하고 일정 만들기'}
      </button>
    </form>
  )
}
