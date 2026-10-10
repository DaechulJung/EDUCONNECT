'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Icon } from '@/components/kds/kds'
import { getOrgImpact } from '@/lib/client'
import { affectedLabel } from '@/lib/impact'

export const impactKey = (programId?: string, grade?: number) => ['org', 'impact', programId ?? null, grade ?? null] as const

// Impact count on an organization save result line (planner module, arch AD-4). catalog screens only place it,
// with the program (or grade) they just saved. Counts only: no child, parent or plan (AC-09.7).
export function ImpactSummary({ programId, grade }: { programId?: string; grade?: number }) {
  const impact = useQuery({
    queryKey: impactKey(programId, grade),
    queryFn: async () => {
      const { data, error } = await getOrgImpact({ query: { program_id: programId, grade } })
      if (error || !data) throw new Error('impact')
      return data
    },
  })
  if (impact.isPending) return null
  if (impact.isError) {
    return (
      <p className="kds-info-line kds-info-line--error" role="alert">
        <Icon name="ic-line-warning" size={16} />영향을 불러오지 못했어요
      </p>
    )
  }
  const count = impact.data.affected_plans
  return (
    <p className="kds-info-line" role="status" aria-label="영향 결과" style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
      <Icon name="ic-line-info" size={16} />
      {affectedLabel(count)}
      {count > 0 && <Link href="/impact" className="kds-text-button">영향 보기</Link>}
    </p>
  )
}
