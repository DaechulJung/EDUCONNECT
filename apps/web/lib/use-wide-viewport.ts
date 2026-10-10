'use client'

import { useSyncExternalStore } from 'react'

// experience Responsive: from a 768px viewport the parent frame is at most 748px, centred, and the comparison
// table and weekly plan take their table form; below 768px the frame stays the 480px phone frame with cards and a
// per-day list. One viewport width decides both, so the frame and the table shape always switch together.
export const WIDE_VIEWPORT_MIN = 768
export const PARENT_FRAME_MAX = { narrow: 480, wide: 748 }

export const isWideViewport = (width: number, min = WIDE_VIEWPORT_MIN) => width >= min

const subscribe = (onChange: () => void) => {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

// Whether the viewport is 768px or wider. Narrow on the server and until hydration, then follows window resizes.
export function useWideViewport(): boolean {
  return useSyncExternalStore(subscribe, () => isWideViewport(window.innerWidth), () => false)
}
