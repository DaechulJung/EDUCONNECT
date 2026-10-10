'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Icon, Popup } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { ImpactSummary, impactKey } from '@/components/impact/ImpactSummary'
import { createProgram, deleteProgram, listPrograms, updateProgram, type Program } from '@/lib/client'
import {
  ACADEMY_TYPES, DAYS, EMPTY_FORM, GRADES, daysLabel, firstError, fromProgram, gradeLabel, serverErrors, toProgramIn, tuitionLabel,
  typeLabel, validateProgram, won, type FormErrors, type FormField, type ProgramForm,
} from '@/lib/program-form'

const PROGRAMS_KEY = ['academy', 'programs'] as const

// FLOW-05: the academy's own program list, the register form (AC-02.1·02.2), edit and delete (AC-02.6).
export default function AcademyProgramsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  // null = register; a program = edit it in place (same id, so plans that use it keep pointing at it).
  const [editing, setEditing] = useState<Program | null>(null)
  const [removing, setRemoving] = useState<Program | null>(null)
  // The program just saved: its save result line shows how many confirmed plans it affects (FLOW-02, #9).
  const [saved, setSaved] = useState<string | null>(null)

  const programs = useQuery({
    queryKey: PROGRAMS_KEY,
    queryFn: async () => {
      const { data, error } = await listPrograms()
      if (error || !data) throw new Error('list_failed')
      return data
    },
  })

  const remove = useMutation({
    mutationFn: async (program: Program) => {
      const { error } = await deleteProgram({ path: { program_id: program.id } })
      if (error) throw new Error('delete_failed')
    },
    onSuccess: () => {
      setRemoving(null)
      toast('프로그램을 삭제했어요')
      return queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY })
    },
  })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-16)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <p className="aidx-eyebrow">학원 관리 <span className="aidx-eyebrow__sep">|</span> 프로그램</p>
          <h1 className="title-large-bold" style={{ margin: 0 }}>학원 프로그램 관리</h1>
        </div>
        {!formOpen && (
          <button className="kds-button" type="button" onClick={() => { setEditing(null); setFormOpen(true) }}>프로그램 등록</button>
        )}
      </div>

      {formOpen && (
        <ProgramFormSection
          key={editing?.id ?? 'new'}
          program={editing}
          onCancel={() => setFormOpen(false)}
          onSaved={(id) => {
            setFormOpen(false)
            setEditing(null)
            setSaved(id)
            toast('프로그램을 저장했어요')
            void queryClient.invalidateQueries({ queryKey: impactKey(id) })
            return queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY })
          }}
        />
      )}

      {saved && <ImpactSummary programId={saved} />}

      <section aria-labelledby="program-list-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <h2 id="program-list-title" className="title-medium-bold" style={{ margin: 0 }}>프로그램 목록</h2>
        {programs.isPending && <p className="body-medium-medium" style={{ color: 'var(--text-secondary-01)' }}>목록을 불러오고 있어요</p>}
        {programs.isError && (
          <p className="kds-info-line kds-info-line--error" role="alert">
            <Icon name="ic-line-warning" size={16} />목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요
          </p>
        )}
        {programs.data && programs.data.length === 0 && (
          <div className="kds-empty">
            <Icon name="ic-line-info" />
            <p>등록한 프로그램이 없어요</p>
            {!formOpen && <button className="kds-button kds-button--secondary" type="button" onClick={() => setFormOpen(true)}>프로그램 등록</button>}
          </div>
        )}
        {programs.data && programs.data.length > 0 && (
          <>
            <p className="kds-result-count">프로그램 <b>{programs.data.length}</b>개</p>
            <div className="kds-table-wrap">
              <table className="kds-table" aria-label="학원 프로그램 목록">
                <thead>
                  <tr>
                    <th scope="col">과목</th>
                    <th scope="col">유형</th>
                    <th scope="col">요일</th>
                    <th scope="col">시간</th>
                    <th scope="col" className="is-num">월 교습비</th>
                    <th scope="col" className="is-num">월 기타경비</th>
                    <th scope="col">강사</th>
                    <th scope="col">대상 학년</th>
                    <th scope="col" className="is-num">정원(현재)</th>
                    <th scope="col"><span className="sr-only">관리</span></th>
                  </tr>
                </thead>
                <tbody>
                  {programs.data.map((program) => (
                    <tr key={program.id}>
                      <td>{program.subject}</td>
                      <td>{typeLabel(program.type)}</td>
                      <td>{daysLabel(program.days)}</td>
                      <td>{program.start}~{program.end}</td>
                      <td className="is-num">
                        {program.monthly_tuition == null ? <span className="kds-tag">미공개</span> : tuitionLabel(program)}
                      </td>
                      <td className="is-num">{won(program.monthly_other ?? 0)}</td>
                      <td>{program.instructor}</td>
                      <td>{gradeLabel(program.grade_min)}~{gradeLabel(program.grade_max)}</td>
                      <td className="is-num">{program.capacity}({program.enrolled})</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="kds-button kds-button--tertiary kds-button--small" type="button" onClick={() => { setEditing(program); setFormOpen(true) }}
                          aria-label={`${program.subject} ${daysLabel(program.days)} ${program.start} 수정`}>
                          수정
                        </button>
                        <button className="kds-button kds-button--tertiary kds-button--small" type="button" onClick={() => setRemoving(program)}
                          aria-label={`${program.subject} ${daysLabel(program.days)} ${program.start} 삭제`}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Popup
        open={removing !== null}
        size="small"
        onClose={() => { if (!remove.isPending) setRemoving(null) }}
        title="이 프로그램을 삭제할까요?"
        description={removing ? `${removing.subject} · ${daysLabel(removing.days)} ${removing.start}~${removing.end}. 삭제하면 보호자 추천에 더 이상 나오지 않아요.` : undefined}
        actions={
          <>
            <button className="kds-button kds-button--secondary" type="button" disabled={remove.isPending} onClick={() => setRemoving(null)}>취소</button>
            <button className="kds-button" type="button" disabled={remove.isPending} onClick={() => removing && remove.mutate(removing)}>
              {remove.isPending ? '삭제하고 있어요' : '삭제하기'}
            </button>
          </>
        }
      >
        {remove.isError && (
          <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />삭제하지 못했어요. 다시 시도해 주세요</p>
        )}
      </Popup>
    </>
  )
}

function ProgramFormSection({ program, onCancel, onSaved }: { program: Program | null; onCancel: () => void; onSaved: (programId: string) => unknown }) {
  const [form, setForm] = useState<ProgramForm>(() => (program ? fromProgram(program) : EMPTY_FORM))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function set<K extends FormField>(key: K, value: ProgramForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleDay(day: ProgramForm['days'][number]) {
    set('days', form.days.includes(day) ? form.days.filter((d) => d !== day) : [...form.days, day])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    setSaveError(null)
    const found = validateProgram(form)
    setErrors(found)
    const first = firstError(found)
    if (first) {
      // First invalid field gets focus (experience FLOW-05 오류). Every input is named after its field.
      formEl.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setPending(true)
    const body = toProgramIn(form)
    const { data, error } = program
      ? await updateProgram({ path: { program_id: program.id }, body })
      : await createProgram({ body })
    setPending(false)
    if (!data) {
      // A 422 field-error array is mapped back onto the fields the client check let through.
      const fromServer = serverErrors(error)
      const firstServer = firstError(fromServer)
      if (firstServer) {
        setErrors(fromServer)
        formEl.querySelector<HTMLElement>(`[name="${firstServer}"]`)?.focus()
        return
      }
      setSaveError('저장하지 못했어요. 입력값을 확인하고 다시 저장해 주세요')
      return
    }
    await onSaved(data.id)
  }

  const field = (key: FormField) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `program-${key}-error` : undefined,
  })
  const wrap = (key: FormField) => `kds-field${errors[key] ? ' kds-field--error' : ''}`
  const helper = (key: FormField) =>
    errors[key] && <span className="kds-field__helper" id={`program-${key}-error`}>{errors[key]}</span>
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-24)' } as const

  return (
    <section aria-labelledby="program-form-title" style={{ maxWidth: 932, display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <h2 id="program-form-title" className="title-medium-bold" style={{ margin: 0 }}>{program ? '프로그램 수정' : '프로그램 등록'}</h2>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        <div style={grid}>
          <div className={wrap('subject')}>
            <label className="kds-field__label" htmlFor="program-subject">과목</label>
            <input className="kds-field__input" id="program-subject" name="subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="예: 코딩" {...field('subject')} />
            {helper('subject')}
          </div>
          <div className="kds-field">
            <label className="kds-field__label" htmlFor="program-type">유형</label>
            <select className="kds-field__input kds-select" id="program-type" name="type" value={form.type} onChange={(e) => set('type', e.target.value as ProgramForm['type'])}>
              {ACADEMY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <fieldset className={wrap('days')} style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={errors.days ? 'program-days-error' : undefined}>
          <legend className="kds-field__label">요일</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)' }}>
            {DAYS.map((d) => (
              <label key={d.value} className="kds-checkbox">
                <input type="checkbox" name="days" value={d.value} checked={form.days.includes(d.value)} onChange={() => toggleDay(d.value)} /> {d.label}
              </label>
            ))}
          </div>
          {helper('days')}
        </fieldset>

        <div style={grid}>
          <div className={wrap('start')}>
            <label className="kds-field__label" htmlFor="program-start">시작 시각</label>
            <input className="kds-field__input" type="time" id="program-start" name="start" value={form.start} onChange={(e) => set('start', e.target.value)} {...field('start')} />
            {helper('start')}
          </div>
          <div className={wrap('end')}>
            <label className="kds-field__label" htmlFor="program-end">종료 시각</label>
            <input className="kds-field__input" type="time" id="program-end" name="end" value={form.end} onChange={(e) => set('end', e.target.value)} {...field('end')} />
            {helper('end')}
          </div>
          <div className={wrap('monthly_tuition')}>
            <label className="kds-field__label" htmlFor="program-monthly_tuition">월 교습비(원)</label>
            <input className="kds-field__input" inputMode="numeric" id="program-monthly_tuition" name="monthly_tuition" value={form.monthly_tuition} onChange={(e) => set('monthly_tuition', e.target.value)} {...field('monthly_tuition')} />
            {helper('monthly_tuition') || <span className="kds-field__helper">비워 두면 &quot;미공개&quot;로 보이고 보호자 추천에서 빠져요</span>}
          </div>
          <div className={wrap('monthly_other')}>
            <label className="kds-field__label" htmlFor="program-monthly_other">월 기타경비(원)</label>
            <input className="kds-field__input" inputMode="numeric" id="program-monthly_other" name="monthly_other" value={form.monthly_other} onChange={(e) => set('monthly_other', e.target.value)} {...field('monthly_other')} />
            {helper('monthly_other')}
          </div>
          <div className={wrap('instructor')}>
            <label className="kds-field__label" htmlFor="program-instructor">강사</label>
            <input className="kds-field__input" id="program-instructor" name="instructor" value={form.instructor} onChange={(e) => set('instructor', e.target.value)} {...field('instructor')} />
            {helper('instructor')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-16)' }}>
            <div className="kds-field">
              <label className="kds-field__label" htmlFor="program-grade_min">대상 학년(시작)</label>
              <select className="kds-field__input kds-select" id="program-grade_min" name="grade_min" value={form.grade_min} onChange={(e) => set('grade_min', e.target.value)}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className={wrap('grade_max')}>
              <label className="kds-field__label" htmlFor="program-grade_max">대상 학년(끝)</label>
              <select className="kds-field__input kds-select" id="program-grade_max" name="grade_max" value={form.grade_max} onChange={(e) => set('grade_max', e.target.value)} {...field('grade_max')}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {helper('grade_max')}
            </div>
          </div>
          <div className={wrap('capacity')}>
            <label className="kds-field__label" htmlFor="program-capacity">정원(명)</label>
            <input className="kds-field__input" inputMode="numeric" id="program-capacity" name="capacity" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} {...field('capacity')} />
            {helper('capacity')}
          </div>
          <div className={wrap('enrolled')}>
            <label className="kds-field__label" htmlFor="program-enrolled">현재 인원(명)</label>
            <input className="kds-field__input" inputMode="numeric" id="program-enrolled" name="enrolled" value={form.enrolled} onChange={(e) => set('enrolled', e.target.value)} {...field('enrolled')} />
            {helper('enrolled')}
          </div>
          <div className={wrap('lat')}>
            <label className="kds-field__label" htmlFor="program-lat">위도</label>
            <input className="kds-field__input" inputMode="decimal" id="program-lat" name="lat" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="예: 37.5012" {...field('lat')} />
            {helper('lat')}
          </div>
          <div className={wrap('lng')}>
            <label className="kds-field__label" htmlFor="program-lng">경도</label>
            <input className="kds-field__input" inputMode="decimal" id="program-lng" name="lng" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="예: 127.0396" {...field('lng')} />
            {helper('lng')}
          </div>
        </div>

        {saveError && (
          <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{saveError}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
          <button className="kds-button kds-button--secondary" type="button" onClick={onCancel} disabled={pending}>취소</button>
          <button className="kds-button" type="submit" disabled={pending}>{pending ? '저장하고 있어요' : '프로그램 저장'}</button>
        </div>
      </form>
    </section>
  )
}
