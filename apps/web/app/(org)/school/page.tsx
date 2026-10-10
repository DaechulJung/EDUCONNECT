'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Icon, Popup, Tabs } from '@/components/kds/kds'
import { useToast } from '@/components/kds/kds-hooks'
import {
  createAfterSchool, deleteAfterSchool, getTimetable, listAfterSchool, updateTimetable,
  type AfterSchoolProgram, type TimetableEntry,
} from '@/lib/client'
import { DAYS, GRADES, daysLabel, gradeLabel, tuitionLabel, won } from '@/lib/program-form'
import {
  EMPTY_AFTER_SCHOOL, OVERLAP_MESSAGE, SCHOOL_DAYS, dismissalDraft, firstAfterSchoolError, isOverlap,
  timetableGrades, toAfterSchoolIn, toTimetableEntries, validateAfterSchool, validateDismissal,
  type AfterSchoolErrors, type AfterSchoolField, type AfterSchoolForm, type DismissalDraft, type DismissalErrors,
  type Dow,
} from '@/lib/school-form'

const TIMETABLE_KEY = ['school', 'timetable'] as const
const AFTER_SCHOOL_KEY = ['school', 'after-school'] as const

// "5학년" for the tab label; the school is one level, so 7..9 read as 1..3학년.
function gradeTab(grade: number): string {
  return `${grade <= 6 ? grade : grade - 6}학년`
}

// FLOW-03: dismissal times by grade (AC-03.1) and after-school programs (AC-03.3·03.4).
export default function SchoolTimetablePage() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <p className="aidx-eyebrow">학교 관리 <span className="aidx-eyebrow__sep">|</span> 시간표</p>
        <h1 className="title-large-bold" style={{ margin: 0 }}>학교 시간표 관리</h1>
      </div>
      <TimetableSection />
      <AfterSchoolSection />
    </>
  )
}

function TimetableSection() {
  const [added, setAdded] = useState<number | null>(null)
  const [newGrade, setNewGrade] = useState('1')
  const [picking, setPicking] = useState(false)
  const [grade, setGrade] = useState<string | null>(null)

  const timetable = useQuery({
    queryKey: TIMETABLE_KEY,
    queryFn: async () => {
      const { data, error } = await getTimetable()
      if (error || !data) throw new Error('timetable_failed')
      return data
    },
  })

  const entries = timetable.data?.entries ?? []
  const grades = timetableGrades(added === null ? entries : [...entries, { grade: added, dow: 'mon', dismissal: '' }])
  const current = grade !== null && grades.includes(Number(grade)) ? grade : grades[0] !== undefined ? String(grades[0]) : null

  return (
    <section aria-labelledby="timetable-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
      <h2 id="timetable-title" className="title-medium-bold" style={{ margin: 0 }}>학년별 하교 시각</h2>
      {timetable.isPending && <p className="body-medium-medium" style={{ color: 'var(--text-secondary-01)' }}>시간표를 불러오고 있어요</p>}
      {timetable.isError && (
        <p className="kds-info-line kds-info-line--error" role="alert">
          <Icon name="ic-line-warning" size={16} />시간표를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요
        </p>
      )}
      {timetable.data && grades.length === 0 && !picking && (
        <div className="kds-empty">
          <Icon name="ic-line-info" />
          <p>아직 입력한 시간표가 없어요</p>
          <button className="kds-button kds-button--secondary" type="button" onClick={() => setPicking(true)}>하교 시각 입력</button>
        </div>
      )}
      {timetable.data && grades.length === 0 && picking && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-8)' }}>
          <div className="kds-field">
            <label className="kds-field__label" htmlFor="timetable-new-grade">학년</label>
            <select className="kds-field__input kds-select" id="timetable-new-grade" value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <button className="kds-button" type="button" onClick={() => { setAdded(Number(newGrade)); setGrade(newGrade) }}>이 학년 입력</button>
        </div>
      )}
      {timetable.data && current !== null && (
        <Tabs
          label="학년"
          value={current}
          onChange={setGrade}
          items={grades.map((g) => ({
            value: String(g),
            label: gradeTab(g),
            content: <GradeTimetable key={g} grade={g} entries={entries} />,
          }))}
        />
      )}
    </section>
  )
}

function GradeTimetable({ grade, entries }: { grade: number; entries: TimetableEntry[] }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [draft, setDraft] = useState<DismissalDraft>(() => dismissalDraft(entries, grade))
  const [errors, setErrors] = useState<DismissalErrors>({})

  const save = useMutation({
    mutationFn: async (next: DismissalDraft) => {
      const { data, error } = await updateTimetable({ body: { entries: toTimetableEntries(grade, next) } })
      if (error || !data) throw new Error('save_failed')
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(TIMETABLE_KEY, data)
      setDraft(dismissalDraft(data.entries, grade))
      toast('시간표를 저장했어요')
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateDismissal(draft)
    setErrors(found)
    const first = SCHOOL_DAYS.find((d) => found[d.value])
    if (first) {
      event.currentTarget.querySelector<HTMLElement>(`[name="${first.value}"]`)?.focus()
      return
    }
    save.mutate(draft)
  }

  function set(dow: Dow, value: string) {
    setDraft((prev) => ({ ...prev, [dow]: value }))
    setErrors((prev) => ({ ...prev, [dow]: undefined }))
  }

  return (
    <form onSubmit={submit} noValidate style={{ maxWidth: 932, display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', paddingTop: 'var(--space-16)' }}>
      <div className="kds-table-wrap">
        <table className="kds-table" aria-label={`${gradeTab(grade)} 하교 시각`}>
          <thead>
            <tr>
              <th scope="col">요일</th>
              <th scope="col">하교 시각</th>
            </tr>
          </thead>
          <tbody>
            {SCHOOL_DAYS.map((d) => (
              <tr key={d.value}>
                <th scope="row">{d.label}</th>
                <td>
                  <div className={`kds-field${errors[d.value] ? ' kds-field--error' : ''}`}>
                    <label className="sr-only" htmlFor={`dismissal-${grade}-${d.value}`}>{d.label}요일 하교 시각</label>
                    <input className="kds-field__input" type="time" id={`dismissal-${grade}-${d.value}`} name={d.value} value={draft[d.value]}
                      onChange={(e) => set(d.value, e.target.value)} aria-invalid={errors[d.value] ? true : undefined}
                      aria-describedby={errors[d.value] ? `dismissal-${grade}-${d.value}-error` : undefined} />
                    {errors[d.value] && <span className="kds-field__helper" id={`dismissal-${grade}-${d.value}-error`}>{errors[d.value]}</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {save.isError && (
        <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />저장하지 못했어요. 다시 저장해 주세요</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="kds-button" type="submit" disabled={save.isPending}>{save.isPending ? '저장하고 있어요' : '시간표 저장'}</button>
      </div>
    </form>
  )
}

function AfterSchoolSection() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<AfterSchoolProgram | null>(null)

  const programs = useQuery({
    queryKey: AFTER_SCHOOL_KEY,
    queryFn: async () => {
      const { data, error } = await listAfterSchool()
      if (error || !data) throw new Error('list_failed')
      return data
    },
  })

  const remove = useMutation({
    mutationFn: async (program: AfterSchoolProgram) => {
      const { error } = await deleteAfterSchool({ path: { program_id: program.id } })
      if (error) throw new Error('delete_failed')
    },
    onSuccess: () => {
      setRemoving(null)
      toast('방과후 프로그램을 삭제했어요')
      return queryClient.invalidateQueries({ queryKey: AFTER_SCHOOL_KEY })
    },
  })

  return (
    <section aria-labelledby="after-school-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', paddingTop: 'var(--space-24)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-16)' }}>
        <h2 id="after-school-title" className="title-medium-bold" style={{ margin: 0 }}>방과후 프로그램</h2>
        {!formOpen && (
          <button className="kds-button kds-button--tertiary" type="button" onClick={() => setFormOpen(true)}>방과후 프로그램 추가</button>
        )}
      </div>

      {formOpen && (
        <AfterSchoolFormSection
          onCancel={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            toast('방과후 프로그램을 저장했어요')
            return queryClient.invalidateQueries({ queryKey: AFTER_SCHOOL_KEY })
          }}
        />
      )}

      {programs.isPending && <p className="body-medium-medium" style={{ color: 'var(--text-secondary-01)' }}>목록을 불러오고 있어요</p>}
      {programs.isError && (
        <p className="kds-info-line kds-info-line--error" role="alert">
          <Icon name="ic-line-warning" size={16} />목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요
        </p>
      )}
      {programs.data && programs.data.length === 0 && (
        <div className="kds-empty">
          <Icon name="ic-line-info" />
          <p>등록한 방과후 프로그램이 없어요</p>
        </div>
      )}
      {programs.data && programs.data.length > 0 && (
        <>
          <p className="kds-result-count">방과후 프로그램 <b>{programs.data.length}</b>개</p>
          <div className="kds-table-wrap">
            <table className="kds-table" aria-label="방과후 프로그램 목록">
              <thead>
                <tr>
                  <th scope="col">과목</th>
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

      <Popup
        open={removing !== null}
        size="small"
        onClose={() => { if (!remove.isPending) setRemoving(null) }}
        title="이 방과후 프로그램을 삭제할까요?"
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
    </section>
  )
}

function AfterSchoolFormSection({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => unknown }) {
  const [form, setForm] = useState<AfterSchoolForm>(EMPTY_AFTER_SCHOOL)
  const [errors, setErrors] = useState<AfterSchoolErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function set<K extends AfterSchoolField>(key: K, value: AfterSchoolForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      // An overlap is about the time pair, so changing either time clears both.
      const timeKey = key === 'start' || key === 'end'
      return { ...prev, [key]: undefined, ...(timeKey && prev.start === OVERLAP_MESSAGE ? { start: undefined, end: undefined } : {}) }
    })
  }

  function toggleDay(day: AfterSchoolForm['days'][number]) {
    set('days', form.days.includes(day) ? form.days.filter((d) => d !== day) : [...form.days, day])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    setSaveError(null)
    const found = validateAfterSchool(form)
    setErrors(found)
    const first = firstAfterSchoolError(found)
    if (first) {
      formEl.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setPending(true)
    const { data, error } = await createAfterSchool({ body: toAfterSchoolIn(form) })
    setPending(false)
    if (isOverlap(error)) {
      // AC-03.4: the API refused an overlapping time (422 time_overlap); nothing was saved.
      setErrors({ start: OVERLAP_MESSAGE, end: OVERLAP_MESSAGE })
      formEl.querySelector<HTMLElement>('[name="start"]')?.focus()
      return
    }
    if (!data) {
      setSaveError('저장하지 못했어요. 입력값을 확인하고 다시 저장해 주세요')
      return
    }
    await onSaved()
  }

  const field = (key: AfterSchoolField) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `after-school-${key}-error` : undefined,
  })
  const wrap = (key: AfterSchoolField) => `kds-field${errors[key] ? ' kds-field--error' : ''}`
  const helper = (key: AfterSchoolField) =>
    errors[key] && <span className="kds-field__helper" id={`after-school-${key}-error`}>{errors[key]}</span>
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-24)' } as const

  return (
    <section aria-labelledby="after-school-form-title" style={{ maxWidth: 932, display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <h3 id="after-school-form-title" className="title-small-bold" style={{ margin: 0 }}>방과후 프로그램 추가</h3>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        <div className={wrap('subject')}>
          <label className="kds-field__label" htmlFor="after-school-subject">과목</label>
          <input className="kds-field__input" id="after-school-subject" name="subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="예: 로봇" {...field('subject')} />
          {helper('subject')}
        </div>

        <fieldset className={wrap('days')} style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={errors.days ? 'after-school-days-error' : undefined}>
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
            <label className="kds-field__label" htmlFor="after-school-start">시작 시각</label>
            <input className="kds-field__input" type="time" id="after-school-start" name="start" value={form.start} onChange={(e) => set('start', e.target.value)} {...field('start')} />
            {helper('start')}
          </div>
          <div className={wrap('end')}>
            <label className="kds-field__label" htmlFor="after-school-end">종료 시각</label>
            <input className="kds-field__input" type="time" id="after-school-end" name="end" value={form.end} onChange={(e) => set('end', e.target.value)} {...field('end')} />
            {helper('end')}
          </div>
          <div className={wrap('monthly_tuition')}>
            <label className="kds-field__label" htmlFor="after-school-monthly_tuition">월 교습비(원)</label>
            <input className="kds-field__input" inputMode="numeric" id="after-school-monthly_tuition" name="monthly_tuition" value={form.monthly_tuition} onChange={(e) => set('monthly_tuition', e.target.value)} {...field('monthly_tuition')} />
            {helper('monthly_tuition') || <span className="kds-field__helper">비워 두면 &quot;미공개&quot;로 보이고 보호자 추천에서 빠져요</span>}
          </div>
          <div className={wrap('monthly_other')}>
            <label className="kds-field__label" htmlFor="after-school-monthly_other">월 기타경비(원)</label>
            <input className="kds-field__input" inputMode="numeric" id="after-school-monthly_other" name="monthly_other" value={form.monthly_other} onChange={(e) => set('monthly_other', e.target.value)} {...field('monthly_other')} />
            {helper('monthly_other')}
          </div>
          <div className={wrap('instructor')}>
            <label className="kds-field__label" htmlFor="after-school-instructor">강사</label>
            <input className="kds-field__input" id="after-school-instructor" name="instructor" value={form.instructor} onChange={(e) => set('instructor', e.target.value)} {...field('instructor')} />
            {helper('instructor')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-16)' }}>
            <div className="kds-field">
              <label className="kds-field__label" htmlFor="after-school-grade_min">대상 학년(시작)</label>
              <select className="kds-field__input kds-select" id="after-school-grade_min" name="grade_min" value={form.grade_min} onChange={(e) => set('grade_min', e.target.value)}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className={wrap('grade_max')}>
              <label className="kds-field__label" htmlFor="after-school-grade_max">대상 학년(끝)</label>
              <select className="kds-field__input kds-select" id="after-school-grade_max" name="grade_max" value={form.grade_max} onChange={(e) => set('grade_max', e.target.value)} {...field('grade_max')}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {helper('grade_max')}
            </div>
          </div>
          <div className={wrap('capacity')}>
            <label className="kds-field__label" htmlFor="after-school-capacity">정원(명)</label>
            <input className="kds-field__input" inputMode="numeric" id="after-school-capacity" name="capacity" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} {...field('capacity')} />
            {helper('capacity')}
          </div>
          <div className={wrap('enrolled')}>
            <label className="kds-field__label" htmlFor="after-school-enrolled">현재 인원(명)</label>
            <input className="kds-field__input" inputMode="numeric" id="after-school-enrolled" name="enrolled" value={form.enrolled} onChange={(e) => set('enrolled', e.target.value)} {...field('enrolled')} />
            {helper('enrolled')}
          </div>
        </div>

        {saveError && (
          <p className="kds-info-line kds-info-line--error" role="alert"><Icon name="ic-line-warning" size={16} />{saveError}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
          <button className="kds-button kds-button--secondary" type="button" onClick={onCancel} disabled={pending}>취소</button>
          <button className="kds-button" type="submit" disabled={pending}>{pending ? '저장하고 있어요' : '방과후 프로그램 저장'}</button>
        </div>
      </form>
    </section>
  )
}
