'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Icon, Sheet, ToastProvider } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { createChild, listChildren, listSchools, type Child } from '@/lib/client'
import {
  CONSENT_MESSAGE, DAY_OPTIONS, EMPTY_EVENT, EMPTY_FORM, GRADES, canSave, eventLabel, needsConsent, toChildIn,
  validateChild, type ChildForm, type EventRow, type FormErrors, type FormField,
} from '@/lib/child-form'
import { gradeLabel } from '@/lib/conditions'

const CHILDREN_KEY = ['children'] as const

// FLOW-04: the parent's children list and the register form (AC-04.1·04.3·04.4).
export default function ChildrenPage() {
  return (
    <ToastProvider>
      <Children />
    </ToastProvider>
  )
}

function Children() {
  const [formOpen, setFormOpen] = useState(false)
  const children = useQuery({
    queryKey: CHILDREN_KEY,
    queryFn: async () => {
      const { data, error } = await listChildren()
      if (error || !data) throw new Error('list_failed')
      return data
    },
  })

  return (
    <section className="kds-section" aria-labelledby="children-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <p className="aidx-eyebrow">EDUCONNECT | 자녀</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-16)' }}>
          <h2 id="children-title" className="title-large-bold" style={{ margin: 0 }}>자녀</h2>
          {!!children.data?.length && (
            <button type="button" className="kds-button kds-button--tertiary" onClick={() => setFormOpen(true)}>자녀 등록</button>
          )}
        </div>
      </div>
      <ChildList query={children} onRegister={() => setFormOpen(true)} />
      <ChildFormSheet open={formOpen} onClose={() => setFormOpen(false)} />
    </section>
  )
}

function ChildList({ query, onRegister }: { query: ReturnType<typeof useQuery<Child[]>>; onRegister: () => void }) {
  if (query.isPending) return <p className="body-medium-medium" role="status" style={{ color: 'var(--text-secondary-01)' }}>자녀 목록을 불러오고 있어요</p>
  if (query.isError) {
    return (
      <div className="kds-empty" role="alert">
        <Icon name="ic-line-info" />
        <p>자녀 목록을 불러오지 못했어요</p>
        <button type="button" className="kds-button kds-button--secondary" onClick={() => query.refetch()}>다시 불러오기</button>
      </div>
    )
  }
  if (!query.data.length) {
    return (
      <div className="kds-empty">
        <Icon name="ic-line-my" />
        <p>등록한 자녀가 없어요</p>
        <button type="button" className="kds-button" onClick={onRegister}>자녀 등록</button>
      </div>
    )
  }
  return (
    <div className="kds-table-wrap">
      <table className="kds-table" aria-label="자녀 목록">
        <thead>
          <tr><th scope="col">별칭</th><th scope="col">학년</th><th scope="col">기존 일정</th></tr>
        </thead>
        <tbody>
          {query.data.map((c) => (
            <tr key={c.id}>
              <td>{c.alias}</td>
              <td>{gradeLabel(c.grade)}</td>
              <td>{c.existing_events?.length ? c.existing_events.map(eventLabel).join(', ') : '없음'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChildFormSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<ChildForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const schools = useQuery({
    queryKey: ['catalog', 'schools'],
    queryFn: async () => (await listSchools()).data ?? [],
    enabled: open,
    staleTime: 60_000,
  })

  const save = useMutation({
    mutationFn: async (f: ChildForm) => {
      const { error } = await createChild({ body: toChildIn(f) })
      if (error) throw new Error('save_failed')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHILDREN_KEY })
      toast('자녀를 저장했어요')
      setForm(EMPTY_FORM)
      setErrors({})
      onClose()
    },
    onError: () => setSaveError('저장하지 못했어요. 입력은 그대로 있어요.'),
  })

  const set = <K extends keyof ChildForm>(key: K, value: ChildForm[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setEvent = (i: number, patch: Partial<EventRow>) =>
    setForm((f) => ({ ...f, events: f.events.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  const consentNeeded = needsConsent(form)
  const blocked = !canSave(form) || save.isPending

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    setSaveError(null)
    const next = validateChild(form)
    setErrors(next)
    const first = (['alias', 'age', 'grade', 'events'] as FormField[]).find((k) => next[k])
    if (first) {
      document.getElementById(`child-${first}`)?.focus()
      return
    }
    save.mutate(form)
  }

  const field = (key: FormField) => (errors[key] ? 'kds-field kds-field--error' : 'kds-field')
  const invalid = (key: FormField) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `child-${key}-error` } : {}
  const errorLine = (key: FormField) =>
    errors[key] && <p id={`child-${key}-error`} className="kds-info-line kds-info-line--error">{errors[key]}</p>

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="자녀 정보를 입력해 주세요"
      footer={
        <>
          <button type="button" className="kds-button kds-button--secondary" onClick={onClose}>취소</button>
          <button type="submit" form="child-form" className="kds-button" disabled={blocked}>
            {save.isPending ? '저장하고 있어요' : '자녀 저장'}
          </button>
        </>
      }
    >
      <form id="child-form" onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        {saveError && <p className="kds-info-line kds-info-line--error" role="alert">{saveError}</p>}
        <label className={field('alias')}>
          <span className="kds-field__label">별칭</span>
          <input id="child-alias" className="kds-field__input" value={form.alias} maxLength={20} onChange={(e) => set('alias', e.target.value)} {...invalid('alias')} />
          {errorLine('alias')}
        </label>
        <label className={field('age')}>
          <span className="kds-field__label">만 나이</span>
          <input id="child-age" className="kds-field__input" inputMode="numeric" value={form.age} onChange={(e) => set('age', e.target.value.replace(/[^0-9]/g, ''))} {...invalid('age')} />
          {errorLine('age')}
        </label>
        <label className={field('grade')}>
          <span className="kds-field__label">학년</span>
          <select id="child-grade" className="kds-field__input kds-select" value={form.grade} onChange={(e) => set('grade', e.target.value)} {...invalid('grade')}>
            <option value="">학년 선택</option>
            {GRADES.map((g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}
          </select>
          {errorLine('grade')}
        </label>
        <label className="kds-field">
          <span className="kds-field__label">학교</span>
          <select className="kds-field__input kds-select" value={form.schoolId} onChange={(e) => set('schoolId', e.target.value)}>
            <option value="">학교 선택 안 함</option>
            {(schools.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="kds-field">
          <span className="kds-field__label">관심사</span>
          <input className="kds-field__input" value={form.interests} placeholder="예: 과학, 미술" onChange={(e) => set('interests', e.target.value)} />
        </label>
        <label className="kds-field">
          <span className="kds-field__label">교육 목표</span>
          <input className="kds-field__input" value={form.goal} maxLength={200} onChange={(e) => set('goal', e.target.value)} />
        </label>
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          <legend className="body-medium-semibold">기존 일정</legend>
          {form.events.map((ev, i) => (
            <div key={i} role="group" aria-label={`기존 일정 ${i + 1}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
              <label className="kds-field">
                <span className="kds-field__label">요일</span>
                <select className="kds-field__input kds-select" value={ev.dow} onChange={(e) => setEvent(i, { dow: e.target.value as EventRow['dow'] })}>
                  {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="kds-field">
                <span className="kds-field__label">내용</span>
                <input className="kds-field__input" value={ev.label} maxLength={30} onChange={(e) => setEvent(i, { label: e.target.value })} />
              </label>
              <label className="kds-field">
                <span className="kds-field__label">시작</span>
                <input className="kds-field__input" type="time" value={ev.start} onChange={(e) => setEvent(i, { start: e.target.value })} />
              </label>
              <label className="kds-field">
                <span className="kds-field__label">끝</span>
                <input className="kds-field__input" type="time" value={ev.end} onChange={(e) => setEvent(i, { end: e.target.value })} />
              </label>
              <button type="button" className="kds-button kds-button--tertiary" onClick={() => set('events', form.events.filter((_, j) => j !== i))}>
                기존 일정 {i + 1} 삭제
              </button>
            </div>
          ))}
          <button id="child-events" type="button" className="kds-button kds-button--tertiary" onClick={() => set('events', [...form.events, EMPTY_EVENT])}>
            기존 일정 추가
          </button>
          {errorLine('events')}
        </fieldset>
        {consentNeeded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <label className="kds-checkbox">
              <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} /> 법정대리인 동의 확인(모의)
            </label>
            {!form.consent && <p className="kds-info-line kds-info-line--error" id="consent-required">{CONSENT_MESSAGE}</p>}
          </div>
        )}
      </form>
    </Sheet>
  )
}
