import { describe, expect, it } from 'vitest'
import { WIDE_TABLE_MIN, isWideContainer } from './use-container-wide'

describe('isWideContainer', () => {
  it('keeps cards inside the 480px parent frame (432px content) whatever the viewport', () => {
    expect(isWideContainer(432)).toBe(false)
    expect(isWideContainer(480)).toBe(false)
  })
  it('takes the table form from 768px of container width', () => {
    expect(isWideContainer(WIDE_TABLE_MIN - 1)).toBe(false)
    expect(isWideContainer(WIDE_TABLE_MIN)).toBe(true)
    expect(isWideContainer(1200)).toBe(true)
  })
})
