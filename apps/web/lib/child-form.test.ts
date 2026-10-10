import { describe, expect, it } from 'vitest'
import { EMPTY_FORM, canSave, needsConsent, toChildIn, validateChild, type ChildForm } from './child-form'

const AC041: ChildForm = {
  alias: '하늘', age: '11', grade: '5', schoolId: 's1', interests: '과학', goal: '수학 심화',
  events: [{ dow: 'sat', start: '10:00', end: '12:00', label: '수영' }], consent: false,
}

describe('child form', () => {
  it('needs consent under 14 only (AC-04.3)', () => {
    expect(needsConsent({ age: '13' })).toBe(true)
    expect(needsConsent({ age: '14' })).toBe(false)
    expect(needsConsent({ age: '' })).toBe(false)
    expect(canSave(AC041)).toBe(false)
    expect(canSave({ ...AC041, consent: true })).toBe(true)
    expect(canSave({ ...AC041, age: '15', grade: '9' })).toBe(true)
  })

  it('builds the API body without real-name or contact keys (AC-04.4)', () => {
    const body = toChildIn({ ...AC041, consent: true })
    expect(body).toEqual({
      alias: '하늘', age: 11, grade: 5, school_id: 's1', interests: ['과학'], goal: '수학 심화',
      existing_events: [{ dow: 'sat', start: '10:00', end: '12:00', label: '수영' }], consent_checked: true,
    })
    expect(Object.keys(body)).not.toEqual(expect.arrayContaining(['name']))
  })

  it('reports field errors', () => {
    expect(validateChild(AC041)).toEqual({})
    const errors = validateChild({ ...EMPTY_FORM, events: [{ dow: 'mon', start: '12:00', end: '10:00', label: 'x' }] })
    expect(Object.keys(errors).sort()).toEqual(['age', 'alias', 'events', 'grade'])
  })
})
