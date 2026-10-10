import type { Program, ProgramIn } from './client'

// Value lists mirror apps/api/app/core/vocab.py (AD-15): codes are sent, labels are shown.
export const ACADEMY_TYPES = [
  { value: 'academy', label: '교과 학원' },
  { value: 'arts', label: '예체능 학원' },
  { value: 'other', label: '기타' },
] as const satisfies readonly { value: ProgramIn['type']; label: string }[]

export const DAYS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
] as const satisfies readonly { value: ProgramIn['days'][number]; label: string }[]

// Grade 1..6 = 초1..초6, 7..9 = 중1..중3 (API grade unit, AD-6).
export const GRADES = Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: gradeLabel(i + 1) }))

export function gradeLabel(grade: number): string {
  return grade <= 6 ? `초${grade}` : `중${grade - 6}`
}

export function typeLabel(type: string): string {
  return ACADEMY_TYPES.find((t) => t.value === type)?.label ?? type
}

export function daysLabel(days: readonly string[]): string {
  return DAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join('·')
}

export function won(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// REQ-02: an empty tuition is stored as NULL and shown as "미공개".
export function tuitionLabel(program: Pick<Program, 'monthly_tuition'>): string {
  return program.monthly_tuition == null ? '미공개' : won(program.monthly_tuition)
}

// Form state is all strings (what the inputs hold); toProgramIn turns a valid form into the API body.
export type ProgramForm = {
  subject: string
  type: ProgramIn['type']
  days: ProgramIn['days']
  start: string
  end: string
  monthly_tuition: string
  monthly_other: string
  instructor: string
  grade_min: string
  grade_max: string
  capacity: string
  enrolled: string
  lat: string
  lng: string
}

export type FormField = keyof ProgramForm
export type FormErrors = Partial<Record<FormField, string>>

export const EMPTY_FORM: ProgramForm = {
  subject: '',
  type: 'academy',
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
  lat: '',
  lng: '',
}

// Order of fields on screen: the first error in this order gets focus (experience FLOW-05 오류).
export const FIELD_ORDER: FormField[] = [
  'subject', 'type', 'days', 'start', 'end', 'monthly_tuition', 'monthly_other', 'instructor',
  'grade_min', 'grade_max', 'capacity', 'enrolled', 'lat', 'lng',
]

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function wholeNumber(value: string): number | null {
  const trimmed = value.trim().replaceAll(',', '')
  if (!/^-?\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

function decimal(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '' || Number.isNaN(Number(trimmed))) return null
  return Number(trimmed)
}

// Screen-side checks for AC-02.2 (SEC-04). The API repeats them (AC-02.3); this only stops the save early.
export function validateProgram(form: ProgramForm): FormErrors {
  const errors: FormErrors = {}
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

  const lat = decimal(form.lat)
  if (lat === null) errors.lat = '위도를 입력해 주세요'
  else if (lat < -90 || lat > 90) errors.lat = '위도는 -90~90 사이여야 해요'
  const lng = decimal(form.lng)
  if (lng === null) errors.lng = '경도를 입력해 주세요'
  else if (lng < -180 || lng > 180) errors.lng = '경도는 -180~180 사이여야 해요'
  return errors
}

export function firstError(errors: FormErrors): FormField | undefined {
  return FIELD_ORDER.find((field) => errors[field])
}

export function toProgramIn(form: ProgramForm): ProgramIn {
  return {
    subject: form.subject.trim(),
    type: form.type,
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
    lat: Number(form.lat),
    lng: Number(form.lng),
  }
}
