import { expect, test } from 'vitest'
import type { Conditions } from './client'
import { budgetError, childGate, childLabel, conditionRows, pickChild, sameConditions, shownDays, subjectOptions } from './conditions'

const around: Conditions = {
  child_id: 'c1',
  subjects: ['영어', '수학'],
  budget_target: 1_000_000,
  budget_cap: 1_100_000,
  types: [],
  days: [],
  density: 'tight',
}

test('조건 카드는 8개 항목을 보이고 빈 값은 정하지 않음, 빈 가능 요일은 기본값 월~금이다 (AC-05.1, experience 157행)', () => {
  const rows = Object.fromEntries(conditionRows(around, childLabel({ alias: '하늘', grade: 5 })).map((r) => [r.label, r.value]))
  expect(rows).toEqual({
    '대상 자녀': '하늘(초5)',
    '선호 과목': '영어·수학',
    '목표 월 예산': '1,000,000원',
    '예산 상한': '1,100,000원',
    '학원 유형': '정하지 않음',
    '기준 위치': '자녀 학교',
    '가능 요일': '월·화·수·목·금',
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

test('대상 자녀는 고른 자녀이고, 고르기 전이나 목록에 없으면 첫 자녀다', () => {
  const kids = [{ id: 'a' }, { id: 'b' }]
  expect(pickChild(kids, null)?.id).toBe('a')
  expect(pickChild(kids, 'b')?.id).toBe('b')
  expect(pickChild(kids, 'gone')?.id).toBe('a')
  expect(pickChild([], null)).toBeNull()
  expect(pickChild(undefined, 'b')).toBeNull()
})

// #5 회귀 (TC-16): the chat must not answer "먼저 자녀를 등록해 주세요" before the children list has answered.
test('childGate: loading until the list answers, error only when it failed, none for no child, ready for a child', () => {
  expect(childGate({ status: 'pending', fetching: true }, false)).toBe('loading')
  expect(childGate({ status: 'error', fetching: false }, false)).toBe('error')
  expect(childGate({ status: 'error', fetching: true }, false)).toBe('loading')
  expect(childGate({ status: 'success', fetching: false }, false)).toBe('none')
  expect(childGate({ status: 'success', fetching: true }, true)).toBe('ready')
})

// #5 회귀 05-2 (experience 157행): an empty 가능 요일 means 월~금, on the card as in the sheet.
test('가능 요일이 비어 있으면 조건 카드와 시트에 월~금이 보인다', () => {
  const rows = conditionRows({ ...around, days: [] }, '하늘')
  expect(rows.find((r) => r.label === '가능 요일')?.value).toBe('월·화·수·목·금')
  expect(shownDays([])).toEqual(['mon', 'tue', 'wed', 'thu', 'fri'])
  expect(shownDays(['sat'])).toEqual(['sat'])
})

// #5 회귀 (PR #31 관찰 2, 정대철_테스트 13:56Z): once the list has arrived, a failed reload keeps that list.
test('childGate: 받은 자녀 목록이 있으면 다시 불러오기가 실패해도 보낼 수 있다', () => {
  expect(childGate({ status: 'error', fetching: false, loaded: true }, true)).toBe('ready')
  expect(childGate({ status: 'error', fetching: false, loaded: true }, false)).toBe('none')
  expect(childGate({ status: 'error', fetching: false, loaded: false }, false)).toBe('error')
})

