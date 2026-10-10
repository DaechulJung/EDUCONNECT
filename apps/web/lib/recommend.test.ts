import { expect, test } from 'vitest'
import type { Recommendation } from './client'
import { recommendationCells, travelLabel, usesFallback } from './recommend'

const row: Recommendation = {
  program_id: 'p1',
  institution_name: '새봄영어수학학원',
  subject: '영어',
  type: 'academy',
  days: ['mon', 'thu'],
  start: '15:00',
  end: '16:20',
  monthly_tuition: 450_000,
  monthly_other: 30_000,
  travel_km: 1.234,
  travel_min: 7,
  reason: '영어 주 2회',
  reason_source: 'llm',
}

test('비교표 한 행은 9칸이고 교습비와 기타경비를 나눠 보인다', () => {
  expect(recommendationCells(row)).toEqual([
    { label: '학원명', value: '새봄영어수학학원' },
    { label: '과목', value: '영어' },
    { label: '유형', value: '교과 학원' },
    { label: '요일', value: '월·목' },
    { label: '시간', value: '15:00~16:20' },
    { label: '월 교습비', value: '450,000원' },
    { label: '월 기타경비', value: '30,000원' },
    { label: '이동', value: '1.2km · 7분 근사' },
    { label: '추천 이유', value: '영어 주 2회' },
  ])
})

test('이동 값에는 근사가 붙는다', () => {
  expect(travelLabel({ travel_km: 0, travel_min: 0 })).toBe('0.0km · 0분 근사')
})

test('템플릿 설명이 하나라도 있으면 대체 안내를 보인다', () => {
  expect(usesFallback([row])).toBe(false)
  expect(usesFallback([row, { reason_source: 'template' }])).toBe(true)
  expect(usesFallback([])).toBe(false)
})
