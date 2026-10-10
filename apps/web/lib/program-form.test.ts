import { expect, test } from 'vitest'
import {
  EMPTY_FORM, firstError, fromProgram, serverErrors, toProgramIn, tuitionLabel, validateProgram, type ProgramForm,
} from './program-form'

// AC-02.1 example values (experience FLOW-05).
const VALID: ProgramForm = {
  ...EMPTY_FORM, subject: '코딩', type: 'academy', days: ['thu', 'tue'], start: '16:00', end: '17:00',
  monthly_tuition: '200,000', monthly_other: '20000', instructor: '시험 강사', grade_min: '4', grade_max: '6',
  capacity: '10', enrolled: '3', lat: '37.5012', lng: '127.0396',
}

test('AC-02.1 값은 오류 없이 API 본문으로 바뀐다(요일은 월~일 순서)', () => {
  expect(validateProgram(VALID)).toEqual({})
  expect(toProgramIn(VALID)).toEqual({
    subject: '코딩', type: 'academy', days: ['tue', 'thu'], start: '16:00', end: '17:00',
    monthly_tuition: 200000, monthly_other: 20000, instructor: '시험 강사', grade_min: 4, grade_max: 6,
    capacity: 10, enrolled: 3, lat: 37.5012, lng: 127.0396,
  })
})

test('AC-02.2 잘못된 값 4종은 각 칸에 오류를 낸다', () => {
  expect(Object.keys(validateProgram({ ...VALID, end: '15:30' }))).toEqual(['end'])
  expect(Object.keys(validateProgram({ ...VALID, monthly_tuition: '-1000' }))).toEqual(['monthly_tuition'])
  expect(Object.keys(validateProgram({ ...VALID, capacity: '0', enrolled: '0' }))).toEqual(['capacity'])
  expect(Object.keys(validateProgram({ ...VALID, lat: '', lng: '' })).sort()).toEqual(['lat', 'lng'])
})

test('첫 오류 칸은 화면 순서로 고른다', () => {
  expect(firstError(validateProgram({ ...VALID, lat: '', subject: ' ' }))).toBe('subject')
})

test('월 교습비를 비우면 미공개(null)로 보낸다', () => {
  const body = toProgramIn({ ...VALID, monthly_tuition: '' })
  expect(body.monthly_tuition).toBeNull()
  expect(tuitionLabel(body)).toBe('미공개')
  expect(tuitionLabel({ monthly_tuition: 200000 })).toBe('200,000원')
})

test('과목·강사는 API처럼 50자를 넘으면 칸 오류다', () => {
  expect(Object.keys(validateProgram({ ...VALID, subject: '가'.repeat(51) }))).toEqual(['subject'])
  expect(Object.keys(validateProgram({ ...VALID, instructor: '가'.repeat(51) }))).toEqual(['instructor'])
  expect(validateProgram({ ...VALID, subject: '가'.repeat(50) })).toEqual({})
})

test('수정: 저장된 프로그램을 폼 값으로 되돌리면 같은 API 본문이 된다', () => {
  const body = toProgramIn(VALID)
  const form = fromProgram({ ...body, id: 'p1', institution_id: 'i1' })
  expect(validateProgram(form)).toEqual({})
  expect(toProgramIn(form)).toEqual(body)
  expect(fromProgram({ ...body, monthly_tuition: null, id: 'p1', institution_id: 'i1' }).monthly_tuition).toBe('')
})

test('422 배열 detail은 칸 오류로 바꾸고 API 원문은 쓰지 않는다', () => {
  const errors = serverErrors({
    detail: [
      { loc: ['body', 'subject'], msg: 'String should have at most 50 characters', type: 'string_too_long' },
      { loc: ['body'], msg: 'Value error, end must be later than start', type: 'value_error' },
      { loc: ['body', 'unknown'], msg: 'x', type: 'x' },
    ],
  })
  expect(Object.keys(errors).sort()).toEqual(['end', 'subject'])
  expect(errors.subject).not.toContain('characters')
  expect(firstError(errors)).toBe('subject')
  expect(serverErrors({ detail: 'not_found' })).toEqual({})
  expect(serverErrors(undefined)).toEqual({})
})
