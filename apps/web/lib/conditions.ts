import type { Child, Conditions } from './client'

// Labels for the codes the API sends (app/core/vocab.py, AD-15). Screens never send labels.
export const TYPE_OPTIONS = [
  { value: 'academy', label: '교과 학원' },
  { value: 'arts', label: '예체능 학원' },
  { value: 'other', label: '기타' },
  { value: 'after_school', label: '방과후' },
] as const
export const DAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
] as const
export const DENSITY_OPTIONS = [
  { value: 'tight', label: '촘촘하게' },
  { value: 'normal', label: '보통' },
] as const
// Same list the API's rule extraction knows before any program exists (services/chat/extract.py).
export const BASE_SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '코딩', '논술', '피아노', '미술', '체육']

export const UNSET = '정하지 않음'

const label = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export function gradeLabel(grade: number): string {
  return grade <= 6 ? `초${grade}` : `중${grade - 6}`
}

export function childLabel(child: Pick<Child, 'alias' | 'grade'>): string {
  return `${child.alias}(${gradeLabel(child.grade)})`
}

// The child the chat targets: the one picked in the sheet's 대상 자녀, else the first.
export function pickChild<T extends Pick<Child, 'id'>>(children: readonly T[] | undefined, id: string | null): T | null {
  return children?.find((c) => c.id === id) ?? children?.[0] ?? null
}

// What the chat can do with the children list. 'loading' until the list answers (experience 98행: send disabled,
// "처리하고 있어요"), 'error' when it failed (error line, send disabled), 'none' when the parent has no child
// (169행: the answer "먼저 자녀를 등록해 주세요"), 'ready' when a child is picked.
export type ChildGate = 'loading' | 'error' | 'none' | 'ready'

export function childGate(list: { status: 'pending' | 'error' | 'success'; fetching: boolean }, hasChild: boolean): ChildGate {
  if (list.status === 'success') return hasChild ? 'ready' : 'none'
  if (list.status === 'error' && !list.fetching) return 'error'
  return 'loading'
}

// The 8 rows of the condition card (experience 조건 카드). Empty values read "정하지 않음".
export function conditionRows(c: Conditions, child: string): { label: string; value: string }[] {
  const subjects = c.subjects ?? []
  const types = c.types ?? []
  const days = c.days ?? []
  return [
    { label: '대상 자녀', value: child },
    { label: '선호 과목', value: subjects.length ? subjects.join('·') : UNSET },
    { label: '목표 월 예산', value: c.budget_target ? formatWon(c.budget_target) : UNSET },
    { label: '예산 상한', value: c.budget_cap ? formatWon(c.budget_cap) : UNSET },
    { label: '학원 유형', value: types.length ? types.map((t) => label(TYPE_OPTIONS, t)).join('·') : UNSET },
    { label: '기준 위치', value: '자녀 학교' },
    { label: '가능 요일', value: days.length ? days.map((d) => label(DAY_OPTIONS, d)).join('·') : UNSET },
    { label: '밀도', value: label(DENSITY_OPTIONS, c.density ?? 'normal') },
  ]
}

export function budgetError(c: Pick<Conditions, 'budget_target' | 'budget_cap'>): string | null {
  if (c.budget_target < 0 || c.budget_cap < 0) return '금액은 0원 이상으로 입력해 주세요'
  if (c.budget_cap < c.budget_target) return '예산 상한은 목표 월 예산 이상이어야 해요'
  return null
}

const sorted = (values: readonly string[] | undefined) => [...(values ?? [])].sort()

export function sameConditions(a: Conditions | null | undefined, b: Conditions | null | undefined): boolean {
  if (!a || !b) return a === b
  return (
    JSON.stringify(sorted(a.subjects)) === JSON.stringify(sorted(b.subjects)) &&
    a.budget_target === b.budget_target &&
    a.budget_cap === b.budget_cap &&
    JSON.stringify(sorted(a.types)) === JSON.stringify(sorted(b.types)) &&
    JSON.stringify(sorted(a.days)) === JSON.stringify(sorted(b.days)) &&
    (a.density ?? 'normal') === (b.density ?? 'normal')
  )
}

export function subjectOptions(...lists: (readonly string[] | undefined)[]): string[] {
  return [...new Set(lists.flatMap((l) => l ?? []).map((s) => s.trim()).filter(Boolean))]
}
