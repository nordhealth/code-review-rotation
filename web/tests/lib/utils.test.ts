import { describe, expect, it } from 'vitest'
import { cn, getAvatarColor } from '~/app/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('handles conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })
})

describe('getAvatarColor', () => {
  it('returns light and dark color objects', () => {
    const result = getAvatarColor('Alice')
    expect(result).toHaveProperty('light')
    expect(result).toHaveProperty('dark')
    expect(result.light).toHaveProperty('bg')
    expect(result.light).toHaveProperty('text')
    expect(result.dark).toHaveProperty('bg')
    expect(result.dark).toHaveProperty('text')
  })

  it('returns consistent color for the same label', () => {
    const first = getAvatarColor('Alice')
    const second = getAvatarColor('Alice')
    expect(first).toEqual(second)
  })

  it('returns different colors for different labels', () => {
    const colors = new Set<string>()
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']) {
      colors.add(getAvatarColor(name).light.bg)
    }
    expect(colors.size).toBeGreaterThan(1)
  })

  it('handles empty string', () => {
    const result = getAvatarColor('')
    expect(result.light.bg).toBeTruthy()
    expect(result.dark.bg).toBeTruthy()
  })
})
