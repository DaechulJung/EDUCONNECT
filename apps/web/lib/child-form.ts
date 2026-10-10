import type { ChildIn, ExistingEvent } from './client'
import { DAY_OPTIONS } from './conditions'

// Children form (experience 자녀 등록 폼, REQ-04). No real name or contact fields (SEC-07).
export const CONSENT_AGE = 14
export const CONSENT_MESSAGE = '법정대리인 동의 확인이 필요합니다'
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export { DAY_OPTIONS }

export type EventRow = { dow: ExistingEvent['dow']; start: string; end: string; label: string }
export type ChildForm = {
  alias: string
  age: string
  grade: string
  schoolId: string
  interests: string
  goal: string
  events: EventRow[]
  consent: boolean
}
export type FormField = 'alias' | 'age' | 'grade' | 'events'
export type FormErrors = Partial<Record<FormField, string>>

export const EMPTY_FORM: ChildForm = { alias: '', age: '', grade: '', schoolId: '', interests: '', goal: '', events: [], consent: false }
export const EMPTY_EVENT: EventRow = { dow: 'sat', start: '', end: '', label: '' }

export function needsConsent(form: Pick<ChildForm, 'age'>): boolean {
  const age = Number(form.age)
  return form.age.trim() !== '' && Number.isInteger(age) && age < CONSENT_AGE
}

// Field errors shown under each field; consent is not a field error, it disables the save button.
export function validateChild(form: ChildForm): FormErrors {
  const errors: FormErrors = {}
  const alias = form.alias.trim()
  if (!alias) errors.alias = '별칭을 입력해 주세요'
  else if (alias.length > 20) errors.alias = '별칭은 20자까지 입력할 수 있어요'
  const age = Number(form.age)
  if (form.age.trim() === '' || !Number.isInteger(age) || age < 0 || age > 18) errors.age = '만 나이를 0~18 사이 숫자로 입력해 주세요'
  if (!form.grade) errors.grade = '학년을 골라 주세요'
  for (const e of form.events) {
    if (!e.start || !e.end || !e.label.trim()) {
      errors.events = '기존 일정의 요일·시작·끝·내용을 모두 입력해 주세요'
      break
    }
    if (e.end <= e.start) {
      errors.events = '기존 일정의 끝 시각은 시작 시각보다 늦어야 해요'
      break
    }
  }
  return errors
}

export function canSave(form: ChildForm): boolean {
  return !needsConsent(form) || form.consent
}

export function toChildIn(form: ChildForm): ChildIn {
  return {
    alias: form.alias.trim(),
    age: Number(form.age),
    grade: Number(form.grade),
    school_id: form.schoolId || null,
    interests: form.interests.split(/[,·]/).map((s) => s.trim()).filter(Boolean),
    goal: form.goal.trim(),
    existing_events: form.events.map((e) => ({ dow: e.dow, start: e.start, end: e.end, label: e.label.trim() })),
    consent_checked: needsConsent(form) ? form.consent : false,
  }
}

export function eventLabel(e: ExistingEvent): string {
  const day = DAY_OPTIONS.find((d) => d.value === e.dow)?.label ?? e.dow
  return `${day} ${e.start}~${e.end} ${e.label}`
}
