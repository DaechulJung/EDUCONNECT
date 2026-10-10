'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Icon, Popup, ToastProvider } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { ConditionCard } from '@/components/parent/ConditionCard'
import { ConditionSheet } from '@/components/parent/ConditionSheet'
import { DismissalForm } from '@/components/parent/DismissalForm'
import { NoPlan, PlanDraft } from '@/components/parent/PlanDraft'
import { RecommendTable } from '@/components/parent/RecommendTable'
import { SwapSheet } from '@/components/parent/SwapSheet'
import { confirmPlan, createPlanDraft, getConditions, listChildren, listSubjects, recommendPrograms, saveConditions, sendChatMessage, updateChild, updatePlan, type Conditions, type Plan, type PlanItem, type Recommendation } from '@/lib/client'
import { swapCandidates, swapProgram, withoutProgram } from '@/lib/plan'
import { BASE_SUBJECTS, childLabel, pickChild, sameConditions, subjectOptions } from '@/lib/conditions'
import { isTimetableMissing, saveDismissalAndReplan, type Dismissal } from '@/lib/dismissal'

type Message = { id: number; role: 'user' | 'ai'; text: string; error?: boolean }

// Only the condition question for now; the schedule and impact questions arrive with #7 and #9.
const SUGGESTIONS = ['초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게']

export default function ChatPage() {
  return (
    <ToastProvider>
      <Chat />
    </ToastProvider>
  )
}

function Chat() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [card, setCard] = useState<Conditions | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [recommending, setRecommending] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [noPlan, setNoPlan] = useState<string[] | null>(null)
  const [needDismissal, setNeedDismissal] = useState(false)
  const [dismissalBusy, setDismissalBusy] = useState(false)
  const [dismissalError, setDismissalError] = useState<string | null>(null)
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [swapItem, setSwapItem] = useState<PlanItem | null>(null)
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapRecs, setSwapRecs] = useState<Recommendation[] | null>(null)
  const [confirming, setConfirming] = useState(false)
  const nextId = useRef(1)
  // Bumped whenever the child or the card changes; a recommendation or plan answer for an older value is dropped.
  const recContext = useRef(0)
  const planContext = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  const children = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const { data, error } = await listChildren()
      if (error) throw new Error('children')
      return data ?? []
    },
  })
  const child = pickChild(children.data, childId)
  const saved = useQuery({
    queryKey: ['conditions', child?.id],
    queryFn: async () => (await getConditions({ path: { child_id: child!.id } })).data ?? null,
    enabled: !!child,
  })
  const subjects = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await listSubjects()).data ?? [],
    staleTime: 60_000,
  })

  const shown = card ?? saved.data ?? null
  const dirty = !!shown && !sameConditions(shown, saved.data)
  const childName = child ? childLabel(child) : ''

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, thinking])

  function clearRecs() {
    recContext.current++
    setRecs(null)
    setRecError(null)
    setRecommending(false)
    planContext.current++
    setPlan(null)
    setNoPlan(null)
    setNeedDismissal(false)
    setDismissalError(null)
    setPlanError(null)
    setPlanning(false)
    setPlanBusy(false)
    setSwapItem(null)
    setSwapRecs(null)
    setSwapLoading(false)
    setConfirming(false)
  }

  const add = (role: Message['role'], text: string, error = false) =>
    setMessages((m) => [...m, { id: nextId.current++, role, text, error }])

  async function ask(question: string) {
    const text = question.trim()
    if (!text || thinking) return
    if (!child) {
      add('user', text)
      add('ai', '먼저 자녀를 등록해 주세요')
      setInput('')
      return
    }
    add('user', text)
    setThinking(true)
    const { data, response } = await sendChatMessage({ body: { child_id: child.id, text } })
    setThinking(false)
    if (!data) {
      add('ai', response?.status === 404 ? '찾을 수 없어요' : '답변을 만들지 못했어요. 다시 시도해 주세요.', true)
      return
    }
    setInput('')
    add('ai', data.reply)
    setCard(data.conditions)
    setSaveError(null)
    clearRecs()
  }

  async function save() {
    if (!child || !shown) return
    setSaving(true)
    setSaveError(null)
    const { subjects, budget_target, budget_cap, types, days, density } = shown
    const body = { subjects, budget_target, budget_cap, types, days, density }
    const { data } = await saveConditions({ path: { child_id: child.id }, body })
    setSaving(false)
    if (!data) {
      setSaveError('저장하지 못했어요. 입력은 그대로 있어요.')
      return
    }
    queryClient.setQueryData(['conditions', child.id], data)
    setCard(data)
    clearRecs()
    toast('조건을 저장했어요')
  }

  async function recommend() {
    if (!child) return
    const context = ++recContext.current
    setRecommending(true)
    setRecError(null)
    const { data } = await recommendPrograms({ body: { child_id: child.id } })
    if (context !== recContext.current) return
    setRecommending(false)
    if (!data) {
      setRecError('추천을 불러오지 못했어요. 다시 시도해 주세요.')
      return
    }
    setRecs(data.items)
  }

  async function makePlan() {
    if (!child) return
    const context = ++planContext.current
    setPlanning(true)
    setPlanError(null)
    setPlan(null)
    setNoPlan(null)
    setNeedDismissal(false)
    const { data, error, response } = await createPlanDraft({ body: { child_id: child.id } })
    if (context !== planContext.current) return
    setPlanning(false)
    if (data) {
      setPlan(data)
      return
    }
    const body = error as { detail?: string; data?: { relaxations?: string[] } } | undefined
    if (response?.status === 422 && body?.detail === 'no_feasible_plan') {
      setNoPlan(body.data?.relaxations ?? [])
      return
    }
    if (isTimetableMissing(response?.status, body)) {
      setNeedDismissal(true)
      return
    }
    setPlanError(response?.status === 404 ? '찾을 수 없어요' : '일정을 만들지 못했어요. 다시 시도해 주세요.')
  }

  // AC-04.5: store the typed 하교 시각 on the child (manual_dismissal), then make the plan again.
  async function saveDismissal(value: Dismissal) {
    if (!child) return
    setDismissalBusy(true)
    setDismissalError(null)
    const saved = await saveDismissalAndReplan(child, value, {
      save: async (childId, body) => {
        const { data } = await updateChild({ path: { child_id: childId }, body })
        setDismissalBusy(false)
        if (data) await queryClient.invalidateQueries({ queryKey: ['children'] })
        return !!data
      },
      replan: makePlan,
    })
    setDismissalBusy(false)
    if (!saved) setDismissalError('하교 시각을 저장하지 못했어요. 다시 시도해 주세요.')
  }

  // 빼기·바꾸기 (#8): send the whole program list; the server re-judges and returns violations and the total.
  async function editPlan(programIds: string[]) {
    if (!plan) return
    const context = planContext.current
    setPlanBusy(true)
    setPlanError(null)
    const { data } = await updatePlan({ path: { plan_id: plan.id }, body: { program_ids: programIds } })
    if (context !== planContext.current) return
    setPlanBusy(false)
    if (data) setPlan(data)
    else setPlanError('일정을 고치지 못했어요. 다시 시도해 주세요.')
  }

  // '바꾸기' candidates come from the recommendation list; fetch it once (without opening the 비교표) if needed.
  async function openSwap(item: PlanItem) {
    setSwapItem(item)
    if (recs || swapRecs || !child) return
    const context = planContext.current
    setSwapLoading(true)
    const { data } = await recommendPrograms({ body: { child_id: child.id } })
    if (context !== planContext.current) return
    setSwapLoading(false)
    setSwapRecs(data?.items ?? [])
  }

  async function pickSwap(programId: string) {
    if (!plan || !swapItem) return
    const ids = swapProgram(plan, swapItem.program_id, programId)
    setSwapItem(null)
    await editPlan(ids)
  }

  async function confirm() {
    if (!plan) return
    const context = planContext.current
    setPlanBusy(true)
    const { data } = await confirmPlan({ path: { plan_id: plan.id } })
    if (context !== planContext.current) return
    setPlanBusy(false)
    setConfirming(false)
    if (!data) {
      setPlanError('일정을 확정하지 못했어요. 겹치는 수업이 없는지 확인해 주세요.')
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['plans'] })
    router.push('/schedule')
  }

  const lastAi = [...messages].reverse().find((m) => m.role === 'ai' && !m.error)?.id

  return (
    <>
      <main style={{ flex: 1, padding: 'var(--space-16) var(--margin-platform)' }}>
        <div className="kds-chat" role="log" aria-live="polite" aria-label="챗봇 대화" style={{ maxWidth: 748, marginInline: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <span className="kds-ai-mark" aria-hidden="true" style={{ width: 32, height: 32 }} />
            <p className="aidx-eyebrow">EDUCONNECT <span className="aidx-eyebrow__sep">|</span> 챗봇</p>
            <h2 className="heading-small-bold" style={{ margin: 0 }}>어떤 학원 일정을 찾을까요?</h2>
            <p className="body-medium-medium" style={{ margin: 0, color: 'var(--text-secondary-01)' }}>
              {child ? `${childName}의 과목·예산·요일을 말씀해 주세요.` : '과목·예산·요일을 말씀해 주세요.'}
            </p>
          </div>

          {children.isError && (
            <p className="kds-info-line kds-info-line--error" role="alert">
              <Icon name="ic-line-warning" size={16} />자녀 정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
            </p>
          )}
          {children.isSuccess && !child && (
            <div className="kds-empty">
              <Icon name="ic-line-info" />
              <p>등록한 자녀가 없어요</p>
              <Link className="kds-button kds-button--secondary kds-button--small" href="/children">자녀 등록</Link>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <p key={m.id} className="kds-chat__user">{m.text}</p>
            ) : (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
                <div className="kds-chat__answer" style={m.error ? { color: 'var(--text-feedback-critical-01)' } : undefined}>{m.text}</div>
                {m.text === '먼저 자녀를 등록해 주세요' && (
                  <Link className="kds-button kds-button--secondary kds-button--small" style={{ alignSelf: 'flex-start' }} href="/children">자녀 등록</Link>
                )}
                {m.id === lastAi && shown && child && (
                  <ConditionCard value={shown} childName={childName} dirty={dirty} saving={saving} error={saveError} onEdit={() => setEditing(true)} onSave={save} canRecommend={!!saved.data} recommending={recommending} onRecommend={recommend} planning={planning} onPlan={makePlan} />
                )}
              </div>
            ),
          )}
          {lastAi === undefined && saved.data && child && (
            <ConditionCard value={shown!} childName={childName} dirty={dirty} saving={saving} error={saveError} onEdit={() => setEditing(true)} onSave={save} canRecommend={!!saved.data} recommending={recommending} onRecommend={recommend} planning={planning} onPlan={makePlan} />
          )}

          {recError && <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{recError}</p>}
          {recs && <RecommendTable items={recs} />}
          {planError && <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{planError}</p>}
          {plan && (
            <PlanDraft
              plan={plan}
              actions={{
                busy: planBusy,
                onRemove: (item) => editPlan(withoutProgram(plan, item.program_id)),
                onSwap: openSwap,
                onConfirm: () => setConfirming(true),
              }}
            />
          )}
          {needDismissal && <DismissalForm busy={dismissalBusy} error={dismissalError} onSubmit={saveDismissal} />}
          {noPlan && <NoPlan relaxations={noPlan} onEdit={() => setEditing(true)} />}

          {thinking && <div className="kds-chat__thinking" role="status">조건을 정리하는 중</div>}
          {!thinking && messages.length === 0 && (
            <ul className="kds-list body-small-medium" aria-label="추천 질문" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => ask(s)} style={{ background: 'var(--surface-primary-02)', borderRadius: 'var(--radius-12)', paddingInline: 'var(--space-16)' }}>
                    {s}
                    <Icon name="ic-line-chevron_right" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div ref={endRef} />
        </div>
      </main>

      <div style={{ position: 'sticky', bottom: 56, background: 'var(--background-default)', paddingBlock: 'var(--space-8)', paddingInline: 'var(--margin-platform)' }}>
        <form className="kds-prompt-dock" style={{ maxWidth: 748, marginInline: 'auto' }} onSubmit={(e) => { e.preventDefault(); ask(input) }}>
          <span className="kds-ai-mark" aria-hidden="true" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="조건을 말씀해 주세요" aria-label="챗봇에 보낼 말" maxLength={500} />
          <button type="submit" className="kds-icon-button" aria-label="보내기" disabled={!input.trim() || thinking}>
            <Icon name="ic-line-send" />
          </button>
        </form>
      </div>

      <SwapSheet
        item={swapItem}
        candidates={swapItem && (recs ?? swapRecs) ? swapCandidates(plan ?? { items: [] }, swapItem, (recs ?? swapRecs)!) : null}
        loading={swapLoading}
        onPick={pickSwap}
        onClose={() => setSwapItem(null)}
      />
      <Popup
        open={confirming}
        onClose={() => setConfirming(false)}
        title="이 일정으로 확정할까요?"
        description="확정한 일정은 일정 탭에 저장돼요."
        size="small"
        actions={
          <>
            <button type="button" className="kds-button kds-button--secondary" onClick={() => setConfirming(false)}>취소</button>
            <button type="button" className="kds-button" disabled={planBusy} onClick={confirm}>일정 확정</button>
          </>
        }
      />
      {shown && child && (
        <ConditionSheet
          open={editing}
          value={shown}
          childId={child.id}
          childOptions={(children.data ?? []).map((c) => ({ id: c.id, label: childLabel(c) }))}
          subjects={subjectOptions(subjects.data, shown.subjects, BASE_SUBJECTS)}
          onApply={(next, nextChildId) => { setCard(next); setChildId(nextChildId); setSaveError(null); clearRecs(); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
