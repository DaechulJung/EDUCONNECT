import { expect, test } from 'vitest'
import { EMPTY_FORM, firstError, toProgramIn, tuitionLabel, validateProgram, type ProgramForm } from './program-form'

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
