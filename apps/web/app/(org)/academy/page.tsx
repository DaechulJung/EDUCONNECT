'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Icon, Popup } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import { createProgram, deleteProgram, listPrograms, type Program } from '@/lib/client'
import {
  ACADEMY_TYPES, DAYS, EMPTY_FORM, GRADES, daysLabel, firstError, gradeLabel, toProgramIn, tuitionLabel,
  typeLabel, validateProgram, won, type FormErrors, type FormField, type ProgramForm,
} from '@/lib/program-form'

const PROGRAMS_KEY = ['academy', 'programs'] as const

// FLOW-05: the academy's own program list, the register form (AC-02.1·02.2) and delete (AC-02.6).
export default function AcademyProgramsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<Program | null>(null)

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
          <button className="kds-button" type="button" onClick={() => setFormOpen(true)}>프로그램 등록</button>
        )}
      </div>

      {formOpen && (
        <ProgramFormSection
          onCancel={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            toast('프로그램을 저장했어요')
            return queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY })
          }}
        />
      )}

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
                      <td>
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

function ProgramFormSection({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => unknown }) {
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM)
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
    const { data } = await createProgram({ body: toProgramIn(form) })
    setPending(false)
    if (!data) {
      setSaveError('저장하지 못했어요. 입력값을 확인하고 다시 저장해 주세요')
      return
    }
    await onSaved()
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
      <h2 id="program-form-title" className="title-medium-bold" style={{ margin: 0 }}>프로그램 등록</h2>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        <div style={grid}>
          <label className={wrap('subject')}>
            <span className="kds-field__label">과목</span>
            <input className="kds-field__input" name="subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="예: 코딩" {...field('subject')} />
            {helper('subject')}
          </label>
          <label className="kds-field">
            <span className="kds-field__label">유형</span>
            <select className="kds-field__input kds-select" name="type" value={form.type} onChange={(e) => set('type', e.target.value as ProgramForm['type'])}>
              {ACADEMY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
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
          <label className={wrap('start')}>
            <span className="kds-field__label">시작 시각</span>
            <input className="kds-field__input" type="time" name="start" value={form.start} onChange={(e) => set('start', e.target.value)} {...field('start')} />
            {helper('start')}
          </label>
          <label className={wrap('end')}>
            <span className="kds-field__label">종료 시각</span>
            <input className="kds-field__input" type="time" name="end" value={form.end} onChange={(e) => set('end', e.target.value)} {...field('end')} />
            {helper('end')}
          </label>
          <label className={wrap('monthly_tuition')}>
            <span className="kds-field__label">월 교습비(원)</span>
            <input className="kds-field__input" inputMode="numeric" name="monthly_tuition" value={form.monthly_tuition} onChange={(e) => set('monthly_tuition', e.target.value)} {...field('monthly_tuition')} />
            {helper('monthly_tuition') || <span className="kds-field__helper">비워 두면 &quot;미공개&quot;로 보이고 보호자 추천에서 빠져요</span>}
          </label>
          <label className={wrap('monthly_other')}>
            <span className="kds-field__label">월 기타경비(원)</span>
            <input className="kds-field__input" inputMode="numeric" name="monthly_other" value={form.monthly_other} onChange={(e) => set('monthly_other', e.target.value)} {...field('monthly_other')} />
            {helper('monthly_other')}
          </label>
          <label className={wrap('instructor')}>
            <span className="kds-field__label">강사</span>
            <input className="kds-field__input" name="instructor" value={form.instructor} onChange={(e) => set('instructor', e.target.value)} {...field('instructor')} />
            {helper('instructor')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-16)' }}>
            <label className="kds-field">
              <span className="kds-field__label">대상 학년(시작)</span>
              <select className="kds-field__input kds-select" name="grade_min" value={form.grade_min} onChange={(e) => set('grade_min', e.target.value)}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </label>
            <label className={wrap('grade_max')}>
              <span className="kds-field__label">대상 학년(끝)</span>
              <select className="kds-field__input kds-select" name="grade_max" value={form.grade_max} onChange={(e) => set('grade_max', e.target.value)} {...field('grade_max')}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {helper('grade_max')}
            </label>
          </div>
          <label className={wrap('capacity')}>
            <span className="kds-field__label">정원(명)</span>
            <input className="kds-field__input" inputMode="numeric" name="capacity" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} {...field('capacity')} />
            {helper('capacity')}
          </label>
          <label className={wrap('enrolled')}>
            <span className="kds-field__label">현재 인원(명)</span>
            <input className="kds-field__input" inputMode="numeric" name="enrolled" value={form.enrolled} onChange={(e) => set('enrolled', e.target.value)} {...field('enrolled')} />
            {helper('enrolled')}
          </label>
          <label className={wrap('lat')}>
            <span className="kds-field__label">위도</span>
            <input className="kds-field__input" inputMode="decimal" name="lat" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="예: 37.5012" {...field('lat')} />
            {helper('lat')}
          </label>
          <label className={wrap('lng')}>
            <span className="kds-field__label">경도</span>
            <input className="kds-field__input" inputMode="decimal" name="lng" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="예: 127.0396" {...field('lng')} />
            {helper('lng')}
          </label>
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
