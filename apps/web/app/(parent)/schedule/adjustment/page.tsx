'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Icon } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { PlanDraft } from '@/components/parent/PlanDraft'
import { acceptAdjustment, getAdjustment, getPlan, rejectAdjustment } from '@/lib/client'
import { NO_ALTERNATIVE, impactLabel, proposalPlan } from '@/lib/impact'
import { relaxationLabels } from '@/lib/plan'

type NoAlternative = { relaxations: string[] }

// 조정안 (experience, FLOW-02): the confirmed plan above, the rule-clean alternative below, then
// '조정안 수락' (the plan becomes the alternative, the tag goes) or '그대로 두기' (nothing changes, the tag stays).
// With no alternative: "조건을 만족하는 대안이 없습니다" and the relaxations the server found (AC-09.6).
export default function Page() {
  // The plan id is a search param (runtime data), read inside a Suspense boundary.
  return (
    <Suspense>
      <Adjustment />
    </Suspense>
  )
}

function Adjustment() {
  const planId = useSearchParams().get('plan') ?? ''
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  const plan = useQuery({
    queryKey: ['plans', planId],
    enabled: planId !== '',
    queryFn: async () => {
      const { data, error } = await getPlan({ path: { plan_id: planId } })
      if (error || !data) throw new Error('plan')
      return data
    },
  })
  const adjustment = useQuery({
    queryKey: ['plans', planId, 'adjustment'],
    enabled: planId !== '',
    queryFn: async () => {
      const { data, error, response } = await getAdjustment({ path: { plan_id: planId } })
      if (data) return { kind: 'proposal' as const, adjustment: data }
      const body = error as { detail?: string; data?: NoAlternative } | undefined
      if (response?.status === 422 && body?.detail === 'no_feasible_plan') return { kind: 'none' as const, relaxations: body.data?.relaxations ?? [] }
      throw new Error('adjustment')
    },
  })

  const done = async (message: string) => {
    toast(message)
    await queryClient.invalidateQueries({ queryKey: ['plans'] })
    router.push('/schedule')
  }
  const accept = useMutation({
    mutationFn: async () => {
      const { data } = await acceptAdjustment({ path: { plan_id: planId } })
      if (!data) throw new Error('accept')
    },
    onSuccess: () => done('조정안으로 일정을 바꿨어요'),
  })
  const reject = useMutation({
    mutationFn: async () => {
      const { data } = await rejectAdjustment({ path: { plan_id: planId } })
      if (!data) throw new Error('reject')
    },
    onSuccess: () => done('기존 일정을 그대로 두었어요'),
  })
  const busy = accept.isPending || reject.isPending
  const keep = (
    <button type="button" className="kds-button kds-button--secondary" disabled={busy} onClick={() => reject.mutate()}>그대로 두기</button>
  )
  const impact = impactLabel(plan.data?.impact)

  return (
    <main style={{ flex: 1, padding: 'var(--space-16) var(--margin-platform)', display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <p className="aidx-eyebrow">EDUCONNECT <span className="aidx-eyebrow__sep">|</span> 일정</p>
        <h2 className="heading-small-bold" style={{ margin: 0 }}>조정안</h2>
        {impact && <span className="kds-tag kds-tag--warning" aria-label="영향 표시" style={{ alignSelf: 'flex-start' }}><Icon name="ic-line-warning" size={16} />{impact}</span>}
      </div>

      {(plan.isError || adjustment.isError || accept.isError || reject.isError) && (
        <p className="kds-info-line kds-info-line--error" role="alert">
          <Icon name="ic-line-warning" size={16} />응답을 받지 못했어요. 잠시 뒤 다시 시도해 주세요
        </p>
      )}

      {plan.data && (
        <section aria-label="기존 계획" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <h3 className="body-large-bold" style={{ margin: 0 }}>기존 계획</h3>
          <PlanDraft plan={plan.data} label="기존 계획 일정" />
        </section>
      )}

      {plan.data && adjustment.data?.kind === 'proposal' && (
        <section aria-label="대안 일정" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <h3 className="body-large-bold" style={{ margin: 0 }}>대안 일정</h3>
          <p className="body-small-medium" style={{ margin: 0, color: 'var(--text-secondary-01)' }}>규칙 위반 {adjustment.data.adjustment.violations.length}건</p>
          <PlanDraft plan={proposalPlan(plan.data, adjustment.data.adjustment)} label="대안 일정표" />
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <button type="button" className="kds-button" disabled={busy} onClick={() => accept.mutate()}>조정안 수락</button>
            {keep}
          </div>
        </section>
      )}

      {adjustment.data?.kind === 'none' && (
        <div className="kds-empty" aria-label="대안 없음">
          <Icon name="ic-line-info" />
          <p>{NO_ALTERNATIVE}</p>
          <ul aria-label="완화할 조건" style={{ margin: 0, paddingLeft: 'var(--space-16)', textAlign: 'left' }}>
            {relaxationLabels(adjustment.data.relaxations).map((r) => <li key={r} className="body-small-medium">{r}</li>)}
          </ul>
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <Link className="kds-button kds-button--small" href="/chat">조건 고치기</Link>
            {keep}
          </div>
        </div>
      )}
    </main>
  )
}
