import { describe, expect, it } from 'vitest'
import { PARENT_FRAME_MAX, WIDE_VIEWPORT_MIN, isWideViewport } from './use-wide-viewport'

describe('isWideViewport', () => {
  it('keeps the phone frame with cards below 768px of viewport', () => {
    expect(isWideViewport(390)).toBe(false)
    expect(isWideViewport(WIDE_VIEWPORT_MIN - 1)).toBe(false)
  })
  it('takes the 748px frame and the table form from 768px, PC widths included', () => {
    expect(isWideViewport(WIDE_VIEWPORT_MIN)).toBe(true)
    expect(isWideViewport(1440)).toBe(true)
  })
  it('fits the wide frame inside the narrowest wide viewport (experience: 최대 748px)', () => {
    expect(PARENT_FRAME_MAX.wide).toBe(748)
    expect(PARENT_FRAME_MAX.wide).toBeLessThan(WIDE_VIEWPORT_MIN)
  })
})
