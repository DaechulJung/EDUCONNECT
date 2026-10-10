import type { Child, ChildIn } from './client'

// AC-04.5: the child's grade has no school timetable, so the parent types 요일별 하교 시각 (experience 85·169행).
export const NO_TIMETABLE = '학교 시간표가 없습니다. 하교 시각을 직접 입력해 주세요'

export const DISMISSAL_DAYS = [
  { value: 'mon', label: '월요일 하교 시각' },
  { value: 'tue', label: '화요일 하교 시각' },
  { value: 'wed', label: '수요일 하교 시각' },
  { value: 'thu', label: '목요일 하교 시각' },
  { value: 'fri', label: '금요일 하교 시각' },
] as const

export type Dismissal = Record<(typeof DISMISSAL_DAYS)[number]['value'], string>

export const EMPTY_DISMISSAL: Dismissal = { mon: '', tue: '', wed: '', thu: '', fri: '' }

// POST /api/plans/draft answers 422 `school_timetable_missing` when the server has no 하교 시각 (arch 233행).
export function isTimetableMissing(status: number | undefined, body: unknown): boolean {
  return status === 422 && (body as { detail?: unknown } | null)?.detail === 'school_timetable_missing'
}

export function dismissalComplete(value: Dismissal): boolean {
  return DISMISSAL_DAYS.every((d) => /^\d\d:\d\d$/.test(value[d.value]))
}

// PUT /api/children/{id} replaces the whole child, so send every stored field plus manual_dismissal.
export function withDismissal(child: Child, value: Dismissal): ChildIn {
  const { id: _id, ...rest } = child
  return { ...rest, manual_dismissal: { ...value } }
}

// Save on the child, then make the plan again. Returns false (no replan) when the save fails.
export async function saveDismissalAndReplan(
  child: Child,
  value: Dismissal,
  deps: { save: (childId: string, body: ChildIn) => Promise<boolean>; replan: () => Promise<void> },
): Promise<boolean> {
  if (!dismissalComplete(value)) return false
  if (!(await deps.save(child.id, withDismissal(child, value)))) return false
  await deps.replan()
  return true
}
