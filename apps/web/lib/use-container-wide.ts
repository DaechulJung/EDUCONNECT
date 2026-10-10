'use client'

import { useCallback, useState } from 'react'

// Tables (추천 비교표, 주간 일정표) take their wide kds-table form only when the frame they sit in is at least
// this wide (experience: table from 768px, cards / per-day list below). The frame's width decides, not the
// viewport's: parent screens always sit in a 480px phone frame, even in a PC browser.
export const WIDE_TABLE_MIN = 768

export const isWideContainer = (width: number, min = WIDE_TABLE_MIN) => width >= min

// A ref for the element whose width decides the shape, and whether it is wide. Narrow until the first
// measurement (server render included), then follows the element through ResizeObserver.
export function useContainerWide<T extends HTMLElement>(min = WIDE_TABLE_MIN): [(node: T | null) => (() => void) | undefined, boolean] {
  const [wide, setWide] = useState(false)
  const ref = useCallback(
    (node: T | null) => {
      if (!node) return undefined
      const update = () => setWide(isWideContainer(node.clientWidth, min))
      update()
      const observer = new ResizeObserver(update)
      observer.observe(node)
      return () => observer.disconnect()
    },
    [min],
  )
  return [ref, wide]
}
