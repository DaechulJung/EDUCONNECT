import { expect, test } from 'vitest'
import {
  EMPTY_AFTER_SCHOOL, dismissalDraft, firstAfterSchoolError, fromAfterSchool, isOverlap, timetableGrades, toAfterSchoolIn,
  toTimetableEntries, validateAfterSchool, validateDismissal, type AfterSchoolForm,
} from './school-form'
import type { AfterSchoolProgram, TimetableEntry } from './client'

const ENTRIES: TimetableEntry[] = [
  { grade: 6, dow: 'mon', dismissal: '14:40' },
  { grade: 5, dow: 'wed', dismissal: '13:40' },
  { grade: 5, dow: 'mon', dismissal: '14:40' },
]

// AC-03.3 example values (experience FLOW-03).
const ROBOT: AfterSchoolForm = {
  ...EMPTY_AFTER_SCHOOL, subject: '로봇', days: ['fri'], start: '14:00', end: '15:00', monthly_tuition: '30,000',
  instructor: '로봇 강사', grade_min: '3', grade_max: '6', capacity: '15', enrolled: '5',
}

test('학년 탭은 시간표에 있는 학년을 오름차순으로 보인다', () => {
  expect(timetableGrades(ENTRIES)).toEqual([5, 6])
  expect(timetableGrades([])).toEqual([])
})

test('AC-03.1 고친 수요일 하교 시각은 그 학년 월~금 행으로 저장된다', () => {
  const draft = { ...dismissalDraft(ENTRIES, 5), tue: '14:40', thu: '14:40', fri: '14:40' }
  expect(draft.wed).toBe('13:40')
  expect(validateDismissal(draft)).toEqual({})
  expect(toTimetableEntries(5, draft).map((e) => `${e.dow} ${e.dismissal}`)).toEqual([
    'mon 14:40', 'tue 14:40', 'wed 13:40', 'thu 14:40', 'fri 14:40',
  ])
})

test('비어 있는 요일 하교 시각은 그 칸 오류다', () => {
  expect(Object.keys(validateDismissal(dismissalDraft(ENTRIES, 5)))).toEqual(['tue', 'thu', 'fri'])
})

test('AC-03.3 로봇 방과후 값은 오류 없이 API 본문으로 바뀐다', () => {
  expect(validateAfterSchool(ROBOT)).toEqual({})
  expect(toAfterSchoolIn(ROBOT)).toEqual({
    subject: '로봇', days: ['fri'], start: '14:00', end: '15:00', monthly_tuition: 30000, monthly_other: 0,
    instructor: '로봇 강사', grade_min: 3, grade_max: 6, capacity: 15, enrolled: 5,
  })
})

test('방과후 폼 오류는 칸마다 나고 첫 오류는 화면 순서로 고른다', () => {
  expect(Object.keys(validateAfterSchool({ ...ROBOT, end: '13:30' }))).toEqual(['end'])
  expect(Object.keys(validateAfterSchool({ ...ROBOT, enrolled: '20' }))).toEqual(['enrolled'])
  expect(firstAfterSchoolError(validateAfterSchool({ ...ROBOT, capacity: '', subject: '' }))).toBe('subject')
})

test('AC-03.4 API 422 time_overlap만 겹침으로 본다', () => {
  expect(isOverlap({ detail: 'time_overlap', data: { program_id: 'x' } })).toBe(true)
  expect(isOverlap({ detail: [{ loc: ['body', 'end'], msg: 'x', type: 'value_error' }] })).toBe(false)
  expect(isOverlap(undefined)).toBe(false)
})

test('수정 폼은 저장된 방과후 값을 그대로 채우고 다시 같은 본문으로 바뀐다 (PR #26)', () => {
  const saved = { ...toAfterSchoolIn(ROBOT), id: 'p1', type: 'after_school' } as unknown as AfterSchoolProgram
  const form = fromAfterSchool(saved)
  expect(form).toEqual({ ...ROBOT, monthly_tuition: '30000' })
  expect(toAfterSchoolIn(form)).toEqual(toAfterSchoolIn(ROBOT))
  expect(fromAfterSchool({ ...saved, monthly_tuition: null }).monthly_tuition).toBe('')
})
