'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Icon } from '@/components/kds/kds'
import { PlanDraft } from '@/components/parent/PlanDraft'
import { listChildren, listPlans } from '@/lib/client'
import { childLabel, formatWon } from '@/lib/conditions'

// 일정 탭 (experience): confirmed plans per child shown in full, drafts as rows. Impact tags arrive with #9.
export default function Page() {
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await listPlans()
      if (error) throw new Error('plans')
      return data ?? []
    },
  })
  const children = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const { data, error } = await listChildren()
      if (error) throw new Error('children')
      return data ?? []
    },
  })
  const name = (childId: string) => {
    const c = children.data?.find((x) => x.id === childId)
    return c ? childLabel(c) : ''
  }
  const confirmed = (plans.data ?? []).filter((p) => p.status === 'confirmed')
  const drafts = (plans.data ?? []).filter((p) => p.status === 'draft')

  return (
    <main style={{ flex: 1, padding: 'var(--space-16) var(--margin-platform)', display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <p className="aidx-eyebrow">EDUCONNECT <span className="aidx-eyebrow__sep">|</span> 일정</p>
        <h2 className="heading-small-bold" style={{ margin: 0 }}>일정</h2>
      </div>

      {plans.isError && (
        <p className="kds-info-line kds-info-line--error" role="alert">
          <Icon name="ic-line-warning" size={16} />일정을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
        </p>
      )}
      {plans.isSuccess && confirmed.length === 0 && (
        <div className="kds-empty">
          <Icon name="ic-line-info" />
          <p>아직 확정한 일정이 없어요</p>
          <Link className="kds-button kds-button--secondary kds-button--small" href="/chat">챗봇에서 일정 만들기</Link>
        </div>
      )}

      {confirmed.map((p) => (
        <section key={p.id} aria-label="확정 계획" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <h3 className="body-large-bold" style={{ margin: 0, display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
            {name(p.child_id)} <span className="kds-tag kds-tag--positive">확정 계획</span>
          </h3>
          <PlanDraft plan={p} label={`${name(p.child_id)} 확정 계획`} />
        </section>
      ))}

      {drafts.length > 0 && (
        <section aria-label="일정 초안 목록" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <h3 className="body-medium-bold" style={{ margin: 0 }}>일정 초안</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {drafts.map((p) => (
              <li key={p.id} className="kds-kv body-small-medium">
                <span className="kds-kv__label">{name(p.child_id)} 초안 · 수업 {p.items.length}개</span>
                <span className="kds-kv__value">{formatWon(p.monthly_total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
