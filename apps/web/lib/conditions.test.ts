import { expect, test } from 'vitest'
import type { Conditions } from './client'
import { budgetError, childLabel, conditionRows, sameConditions, subjectOptions } from './conditions'

const around: Conditions = {
  child_id: 'c1',
  subjects: ['영어', '수학'],
  budget_target: 1_000_000,
  budget_cap: 1_100_000,
  types: [],
  days: [],
  density: 'tight',
}

test('조건 카드는 8개 항목을 보이고 빈 값은 정하지 않음이다 (AC-05.1)', () => {
  const rows = Object.fromEntries(conditionRows(around, childLabel({ alias: '하늘', grade: 5 })).map((r) => [r.label, r.value]))
  expect(rows).toEqual({
    '대상 자녀': '하늘(초5)',
    '선호 과목': '영어·수학',
    '목표 월 예산': '1,000,000원',
    '예산 상한': '1,100,000원',
    '학원 유형': '정하지 않음',
    '기준 위치': '자녀 학교',
    '가능 요일': '정하지 않음',
    '밀도': '촘촘하게',
  })
})

test('유형·요일은 코드가 아니라 화면 라벨로 보인다 (AC-05.4)', () => {
  const rows = conditionRows({ ...around, types: ['academy'], days: ['mon', 'wed', 'fri'] }, '하늘(초5)')
  expect(rows.find((r) => r.label === '학원 유형')?.value).toBe('교과 학원')
  expect(rows.find((r) => r.label === '가능 요일')?.value).toBe('월·수·금')
})

test('예산 상한이 목표보다 작으면 저장 전에 막는다', () => {
  expect(budgetError({ budget_target: 1_000_000, budget_cap: 900_000 })).toContain('예산 상한')
  expect(budgetError({ budget_target: 1_000_000, budget_cap: 1_000_000 })).toBeNull()
})

test('저장하지 않은 수정이 있는지 순서와 무관하게 비교한다', () => {
  expect(sameConditions(around, { ...around, subjects: ['수학', '영어'] })).toBe(true)
  expect(sameConditions(around, { ...around, budget_cap: 1_000_000 })).toBe(false)
  expect(sameConditions(around, null)).toBe(false)
})

test('과목 선택지는 중복 없이 합친다', () => {
  expect(subjectOptions(['영어', ' 수학'], ['수학', '피아노'], undefined)).toEqual(['영어', '수학', '피아노'])
})
