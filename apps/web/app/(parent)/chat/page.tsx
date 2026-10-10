'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon, ToastProvider } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { ConditionCard } from '@/components/parent/ConditionCard'
import { ConditionSheet } from '@/components/parent/ConditionSheet'
import { RecommendTable } from '@/components/parent/RecommendTable'
import { getConditions, listChildren, listSubjects, recommendPrograms, saveConditions, sendChatMessage, type Conditions, type Recommendation } from '@/lib/client'
import { BASE_SUBJECTS, childLabel, pickChild, sameConditions, subjectOptions } from '@/lib/conditions'

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
  const nextId = useRef(1)
  // Bumped whenever the child or the card changes; a recommendation answer for an older value is dropped.
  const recContext = useRef(0)
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
                  <ConditionCard value={shown} childName={childName} dirty={dirty} saving={saving} error={saveError} onEdit={() => setEditing(true)} onSave={save} canRecommend={!!saved.data} recommending={recommending} onRecommend={recommend} />
                )}
              </div>
            ),
          )}
          {lastAi === undefined && saved.data && child && (
            <ConditionCard value={shown!} childName={childName} dirty={dirty} saving={saving} error={saveError} onEdit={() => setEditing(true)} onSave={save} canRecommend={!!saved.data} recommending={recommending} onRecommend={recommend} />
          )}

          {recError && <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{recError}</p>}
          {recs && <RecommendTable items={recs} />}

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
