import type { AfterSchoolIn, ErrorBody, TimetableEntry } from './client'
import { DAYS } from './program-form'

// REQ-03 school screens: the dismissal timetable by grade and the after-school form.

export type Dow = TimetableEntry['dow']

// Weekdays a school timetable row is entered for (experience FLOW-03: "요일별 하교 시각 행").
export const SCHOOL_DAYS = DAYS.filter((d) => d.value !== 'sat' && d.value !== 'sun')

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export function timetableGrades(entries: readonly TimetableEntry[]): number[] {
  return [...new Set(entries.map((e) => e.grade))].sort((a, b) => a - b)
}

// Dismissal draft for one grade: { mon: '14:40', ... }; days without a row are ''.
export type DismissalDraft = Record<Dow, string>

export function dismissalDraft(entries: readonly TimetableEntry[], grade: number): DismissalDraft {
  const draft = Object.fromEntries(DAYS.map((d) => [d.value, ''])) as DismissalDraft
  for (const e of entries) if (e.grade === grade) draft[e.dow] = e.dismissal
  return draft
}

export type DismissalErrors = Partial<Record<Dow, string>>

export function validateDismissal(draft: DismissalDraft): DismissalErrors {
  const errors: DismissalErrors = {}
  for (const d of SCHOOL_DAYS) {
    if (!HHMM.test(draft[d.value])) errors[d.value] = `${d.label}요일 하교 시각을 입력해 주세요`
  }
  return errors
}

export function toTimetableEntries(grade: number, draft: DismissalDraft): TimetableEntry[] {
  return SCHOOL_DAYS.map((d) => ({ grade, dow: d.value, dismissal: draft[d.value] }))
}

// After-school form state is all strings, like the academy program form.
export type AfterSchoolForm = {
  subject: string
  days: AfterSchoolIn['days']
  start: string
  end: string
  monthly_tuition: string
  monthly_other: string
  instructor: string
  grade_min: string
  grade_max: string
  capacity: string
  enrolled: string
}

export type AfterSchoolField = keyof AfterSchoolForm
export type AfterSchoolErrors = Partial<Record<AfterSchoolField, string>>

export const EMPTY_AFTER_SCHOOL: AfterSchoolForm = {
  subject: '',
  days: [],
  start: '',
  end: '',
  monthly_tuition: '',
  monthly_other: '0',
  instructor: '',
  grade_min: '1',
  grade_max: '6',
  capacity: '',
  enrolled: '0',
}

export const AFTER_SCHOOL_FIELD_ORDER: AfterSchoolField[] = [
  'subject', 'days', 'start', 'end', 'monthly_tuition', 'monthly_other', 'instructor',
  'grade_min', 'grade_max', 'capacity', 'enrolled',
]

// AC-03.4: shown next to the time fields when the API answers 422 time_overlap.
export const OVERLAP_MESSAGE = '시간이 겹칩니다'

function wholeNumber(value: string): number | null {
  const trimmed = value.trim().replaceAll(',', '')
  if (!/^-?\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

// Screen-side checks (SEC-04). The overlap check needs other programs, so only the API does it.
export function validateAfterSchool(form: AfterSchoolForm): AfterSchoolErrors {
  const errors: AfterSchoolErrors = {}
  if (!form.subject.trim()) errors.subject = '과목을 입력해 주세요'
  if (form.days.length === 0) errors.days = '요일을 하나 이상 골라 주세요'
  if (!HHMM.test(form.start)) errors.start = '시작 시각을 입력해 주세요'
  if (!HHMM.test(form.end)) errors.end = '종료 시각을 입력해 주세요'
  else if (HHMM.test(form.start) && form.end <= form.start) errors.end = '종료 시각은 시작 시각보다 늦어야 해요'

  if (form.monthly_tuition.trim() !== '') {
    const tuition = wholeNumber(form.monthly_tuition)
    if (tuition === null) errors.monthly_tuition = '월 교습비는 숫자로 입력해 주세요'
    else if (tuition < 0) errors.monthly_tuition = '월 교습비는 0원 이상이어야 해요'
  }
  const other = wholeNumber(form.monthly_other)
  if (other === null) errors.monthly_other = '월 기타경비는 숫자로 입력해 주세요(없으면 0)'
  else if (other < 0) errors.monthly_other = '월 기타경비는 0원 이상이어야 해요'

  if (!form.instructor.trim()) errors.instructor = '강사를 입력해 주세요'
  if (Number(form.grade_min) > Number(form.grade_max)) errors.grade_max = '끝 학년은 시작 학년보다 같거나 높아야 해요'

  const capacity = wholeNumber(form.capacity)
  if (capacity === null) errors.capacity = '정원을 숫자로 입력해 주세요'
  else if (capacity <= 0) errors.capacity = '정원은 1명 이상이어야 해요'
  const enrolled = wholeNumber(form.enrolled)
  if (enrolled === null || enrolled < 0) errors.enrolled = '현재 인원은 0명 이상 숫자로 입력해 주세요'
  else if (capacity !== null && capacity > 0 && enrolled > capacity) errors.enrolled = '현재 인원은 정원보다 많을 수 없어요'
  return errors
}

export function firstAfterSchoolError(errors: AfterSchoolErrors): AfterSchoolField | undefined {
  return AFTER_SCHOOL_FIELD_ORDER.find((field) => errors[field])
}

export function toAfterSchoolIn(form: AfterSchoolForm): AfterSchoolIn {
  return {
    subject: form.subject.trim(),
    days: DAYS.map((d) => d.value).filter((d) => form.days.includes(d)),
    start: form.start,
    end: form.end,
    monthly_tuition: form.monthly_tuition.trim() === '' ? null : wholeNumber(form.monthly_tuition),
    monthly_other: wholeNumber(form.monthly_other) ?? 0,
    instructor: form.instructor.trim(),
    grade_min: Number(form.grade_min),
    grade_max: Number(form.grade_max),
    capacity: wholeNumber(form.capacity) ?? 0,
    enrolled: wholeNumber(form.enrolled) ?? 0,
  }
}

// API 422 `{"detail": "time_overlap"}` (AD-13) → field errors on both time inputs.
export function isOverlap(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as ErrorBody).detail === 'time_overlap'
}
