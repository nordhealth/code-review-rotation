import { describe, expect, it } from 'vitest'
import { capitalizeFirst, formatDate, formatFullName, getInitials } from '~/app/utils/formatting'

describe('getInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getInitials('João', 'Gonçalves')).toBe('JG')
  })

  it('returns single initial when no last name', () => {
    expect(getInitials('João')).toBe('J')
  })

  it('returns uppercase initials', () => {
    expect(getInitials('anja', 'freihube')).toBe('AF')
  })

  it('handles empty strings', () => {
    expect(getInitials('', '')).toBe('')
  })
})

describe('capitalizeFirst', () => {
  it('capitalizes the first letter', () => {
    expect(capitalizeFirst('wednesday')).toBe('Wednesday')
  })

  it('keeps already capitalized strings', () => {
    expect(capitalizeFirst('Monday')).toBe('Monday')
  })

  it('handles single character', () => {
    expect(capitalizeFirst('a')).toBe('A')
  })

  it('handles empty string', () => {
    expect(capitalizeFirst('')).toBe('')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-03-11')
    expect(result).toContain('Mar')
    expect(result).toContain('2026')
    expect(result).toContain('11')
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-01-15'))
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })
})

describe('formatFullName', () => {
  it('joins first and last name', () => {
    expect(formatFullName('João', 'Gonçalves')).toBe('João Gonçalves')
  })

  it('trims when last name is empty', () => {
    expect(formatFullName('João', '')).toBe('João')
  })

  it('trims when first name is empty', () => {
    expect(formatFullName('', 'Gonçalves')).toBe('Gonçalves')
  })
})
