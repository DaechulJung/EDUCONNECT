import { describe, expect, it, vi } from 'vitest'
import type { Child, ChildIn } from './client'
import { DISMISSAL_DAYS, EMPTY_DISMISSAL, NO_TIMETABLE, dismissalComplete, isTimetableMissing, saveDismissalAndReplan, withDismissal, type Dismissal } from './dismissal'

const CHILD: Child = {
  id: 'c6', alias: '육', age: 12, grade: 6, school_id: 's1', interests: ['과학'], goal: '',
  existing_events: [{ dow: 'sat', start: '10:00', end: '12:00', label: '수영' }], manual_dismissal: {}, consent_checked: true,
}
const VALUE: Dismissal = { mon: '15:00', tue: '14:50', wed: '14:00', thu: '15:00', fri: '14:30' }

describe('dismissal form (AC-04.5)', () => {
  it('shows only on 422 school_timetable_missing, with the AC text and five weekday fields', () => {
    expect(isTimetableMissing(422, { detail: 'school_timetable_missing' })).toBe(true)
    expect(isTimetableMissing(422, { detail: 'no_feasible_plan' })).toBe(false)
    expect(isTimetableMissing(404, { detail: 'school_timetable_missing' })).toBe(false)
    expect(isTimetableMissing(422, null)).toBe(false)
    expect(NO_TIMETABLE).toBe('학교 시간표가 없습니다. 하교 시각을 직접 입력해 주세요')
    expect(DISMISSAL_DAYS.map((d) => d.label)).toEqual(['월요일 하교 시각', '화요일 하교 시각', '수요일 하교 시각', '목요일 하교 시각', '금요일 하교 시각'])
  })

  it('needs all five days', () => {
    expect(dismissalComplete(EMPTY_DISMISSAL)).toBe(false)
    expect(dismissalComplete({ ...VALUE, fri: '' })).toBe(false)
    expect(dismissalComplete(VALUE)).toBe(true)
  })

  it('PUTs the whole child with manual_dismissal, then makes the plan again', async () => {
    const save = vi.fn(async (_id: string, _body: ChildIn) => true)
    const replan = vi.fn(async () => {})
    expect(await saveDismissalAndReplan(CHILD, VALUE, { save, replan })).toBe(true)
    expect(save).toHaveBeenCalledWith('c6', {
      alias: '육', age: 12, grade: 6, school_id: 's1', interests: ['과학'], goal: '',
      existing_events: [{ dow: 'sat', start: '10:00', end: '12:00', label: '수영' }], manual_dismissal: VALUE, consent_checked: true,
    })
    expect(withDismissal(CHILD, VALUE)).not.toHaveProperty('id')
    expect(replan).toHaveBeenCalledTimes(1)
  })

  it('does not make the plan again when the save fails or a day is empty', async () => {
    const replan = vi.fn(async () => {})
    expect(await saveDismissalAndReplan(CHILD, VALUE, { save: async () => false, replan })).toBe(false)
    const save = vi.fn(async () => true)
    expect(await saveDismissalAndReplan(CHILD, { ...VALUE, mon: '' }, { save, replan })).toBe(false)
    expect(save).not.toHaveBeenCalled()
    expect(replan).not.toHaveBeenCalled()
  })
})
