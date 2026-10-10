import type { Recommendation } from './client'
import { DAY_OPTIONS, TYPE_OPTIONS, formatWon } from './conditions'

export const FALLBACK_NOTE = 'AI 설명을 불러오지 못해 기본 설명을 보여 드려요'

const label = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value

// One comparison row (experience 추천 비교표). Order and filtering are the server's; the screen only formats.
export function recommendationCells(r: Recommendation): { label: string; value: string }[] {
  return [
    { label: '학원명', value: r.institution_name },
    { label: '과목', value: r.subject },
    { label: '유형', value: label(TYPE_OPTIONS, r.type) },
    { label: '요일', value: r.days.map((d) => label(DAY_OPTIONS, d)).join('·') },
    { label: '시간', value: `${r.start}~${r.end}` },
    { label: '월 교습비', value: formatWon(r.monthly_tuition) },
    { label: '월 기타경비', value: formatWon(r.monthly_other) },
    { label: '이동', value: travelLabel(r) },
    { label: '추천 이유', value: r.reason },
  ]
}

export function travelLabel(r: Pick<Recommendation, 'travel_km' | 'travel_min'>): string {
  return `${r.travel_km.toFixed(1)}km · ${r.travel_min}분 근사`
}

export function usesFallback(items: readonly Pick<Recommendation, 'reason_source'>[]): boolean {
  return items.some((r) => r.reason_source === 'template')
}
