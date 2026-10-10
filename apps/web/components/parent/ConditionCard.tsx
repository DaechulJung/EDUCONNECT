'use client'

import type { Conditions } from '@/lib/client'
import { conditionRows } from '@/lib/conditions'

// Condition card under the chat answer (experience 조건 카드): 8 name·value rows, edit and save.
// '추천 보기' uses the saved conditions, so it waits while the card has unsaved edits.
export function ConditionCard({ value, childName, dirty, saving, error, onEdit, onSave, canRecommend, recommending, onRecommend }: {
  value: Conditions
  childName: string
  dirty: boolean
  saving: boolean
  error: string | null
  onEdit: () => void
  onSave: () => void
  canRecommend: boolean
  recommending: boolean
  onRecommend: () => void
}) {
  return (
    <article className="kds-card" aria-label="조건 카드" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <h3 className="body-large-bold" style={{ margin: 0 }}>조건 카드</h3>
      {conditionRows(value, childName).map((row) => (
        <div key={row.label} className="kds-kv body-small-medium" role="group" aria-label={row.label}>
          <span className="kds-kv__label">{row.label}</span>
          <span className="kds-kv__value">{row.value}</span>
        </div>
      ))}
      {dirty && <p className="kds-info-line caption-medium-medium" style={{ margin: 0 }}>먼저 조건을 저장해 주세요</p>}
      {error && <p className="kds-info-line kds-info-line--error caption-medium-medium" role="alert" style={{ margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-8)' }}>
        <button type="button" className="kds-button kds-button--secondary" style={{ flex: 1 }} onClick={onEdit}>고치기</button>
        <button type="button" className="kds-button" style={{ flex: 1 }} disabled={saving || !dirty} onClick={onSave}>
          {saving ? '처리하고 있어요' : '조건 저장'}
        </button>
      </div>
      <button type="button" className="kds-button kds-button--tertiary" disabled={dirty || !canRecommend || recommending} onClick={onRecommend}>
        {recommending ? '추천을 찾고 있어요' : '추천 보기'}
      </button>
    </article>
  )
}
