'use client'

import { Icon, Sheet } from '@/components/kds/kds'
import type { PlanItem, Recommendation } from '@/lib/client'
import { DAY_OPTIONS, formatWon } from '@/lib/conditions'

const dayLabel = (days: readonly string[]) => days.map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label ?? d).join('·')

// '바꾸기' bottom sheet: same-subject recommendations not in the draft. Picking one replaces the item in place;
// the server re-judges the draft, so a candidate that clashes with school time comes back marked "시간 중복".
// failed: the candidate request failed (experience 100행 오류: 문구 + '다시 시도'), not an empty list.
export function SwapSheet({ item, candidates, loading, failed = false, onRetry, onPick, onClose }: {
  item: PlanItem | null
  candidates: Recommendation[] | null
  loading: boolean
  failed?: boolean
  onRetry?: () => void
  onPick: (programId: string) => void
  onClose: () => void
}) {
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? `${item.subject} 수업 바꾸기` : '수업 바꾸기'}>
      {loading && <p className="body-small-medium" role="status">후보를 찾고 있어요</p>}
      {!loading && failed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', alignItems: 'flex-start' }}>
          <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />응답을 받지 못했어요. 입력은 그대로 있어요.</p>
          <button type="button" className="kds-button kds-button--secondary kds-button--small" onClick={onRetry}>다시 시도</button>
        </div>
      )}
      {!loading && !failed && candidates && candidates.length === 0 && (
        <div className="kds-empty"><p>바꿀 수 있는 같은 과목 수업이 없어요</p></div>
      )}
      {!loading && candidates && candidates.length > 0 && (
        <ul aria-label="바꿀 수업" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {candidates.map((c) => (
            <li key={c.program_id}>
              <button type="button" className="kds-list__item" style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onClick={() => onPick(c.program_id)}>
                <span className="body-medium-bold">{c.institution_name} {c.subject}</span>
                <span className="caption-medium-medium">{dayLabel(c.days)} {c.start}~{c.end} · 월 {formatWon(c.monthly_tuition + c.monthly_other)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
