import type { Health } from './client'

export type HealthRow = { label: string; status: 'online' | 'error' }

// One row per dependency the API checks; the home page shows an error tag only on rows that are down.
export function healthRows(health: Health): HealthRow[] {
  return [
    { label: '데이터베이스', status: health.db ? 'online' : 'error' },
    {
      label: health.vector ? `벡터 검색 (pgvector ${health.vector})` : '벡터 검색 (마이그레이션 전)',
      status: health.vector ? 'online' : 'error',
    },
    { label: 'Redis', status: health.redis ? 'online' : 'error' },
  ]
}
