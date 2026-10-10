'use client'

import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/kds/kds'
import { getOrgImpact, listPrograms } from '@/lib/client'
import { gradeLabel } from '@/lib/conditions'
import { IMPACT_NONE, affectedLabel } from '@/lib/impact'
import { useMe } from '@/lib/use-session'

// 영향 확인 (experience, FLOW-02): how many confirmed plans this institution's changes affect, per changed item.
// Counts only — no child, parent or plan (AC-09.7, SEC-03·07). Academy items are named from the staff's own list.
export default function Page() {
  const me = useMe()
  const academy = me.data?.role === 'academy'
  const impact = useQuery({
    queryKey: ['org', 'impact', null, null],
    queryFn: async () => {
      const { data, error } = await getOrgImpact()
      if (error || !data) throw new Error('impact')
      return data
    },
  })
  const programs = useQuery({
    queryKey: ['academy', 'programs'],
    enabled: academy,
    queryFn: async () => {
      const { data, error } = await listPrograms()
      if (error || !data) throw new Error('programs')
      return data
    },
  })
  const itemName = (programId?: string | null, grade?: number | null) => {
    if (grade != null) return `${gradeLabel(grade)} 하교 시각`
    const p = programs.data?.find((x) => x.id === programId)
    return p ? `${p.subject} ${p.start}~${p.end}` : '프로그램'
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <p className="aidx-eyebrow">기관 관리 <span className="aidx-eyebrow__sep">|</span> 영향 확인</p>
        <h1 className="title-large-bold" style={{ margin: 0 }}>영향 확인</h1>
      </div>
      {impact.isError && (
        <p className="kds-info-line kds-info-line--error" role="alert">
          <Icon name="ic-line-warning" size={16} />영향을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요
        </p>
      )}
      {impact.data && impact.data.affected_plans === 0 && (
        <div className="kds-empty">
          <Icon name="ic-line-info" />
          <p>{IMPACT_NONE}</p>
        </div>
      )}
      {impact.data && impact.data.affected_plans > 0 && (
        <section aria-label="영향 요약" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          <p className="title-medium-bold" role="status" style={{ margin: 0 }}>{affectedLabel(impact.data.affected_plans)}</p>
          <ul aria-label="변경 항목" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {impact.data.items.filter((i) => i.affected_plans > 0).map((i) => (
              <li key={i.program_id ?? `g${i.grade}`} className="kds-kv body-medium-medium">
                <span className="kds-kv__label">{itemName(i.program_id, i.grade)}</span>
                <span className="kds-kv__value">{affectedLabel(i.affected_plans)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
