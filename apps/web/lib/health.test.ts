import { expect, test } from 'vitest'
import { healthRows } from './health'

test('의존성마다 한 줄씩 상태를 만든다', () => {
  expect(healthRows({ status: 'ok', db: true, redis: true, vector: '0.8.7' })).toEqual([
    { label: '데이터베이스', status: 'online' },
    { label: '벡터 검색 (pgvector 0.8.7)', status: 'online' },
    { label: 'Redis', status: 'online' },
  ])
})

test('마이그레이션 전이면 벡터 검색을 오류로 보여 준다', () => {
  const rows = healthRows({ status: 'degraded', db: true, redis: false, vector: null })
  expect(rows.map((r) => r.status)).toEqual(['online', 'error', 'error'])
  expect(rows[1].label).toBe('벡터 검색 (마이그레이션 전)')
})
