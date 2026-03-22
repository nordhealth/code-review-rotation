import { describe, expect, it } from 'vitest'
import { selectBalanced, shuffleArray } from '~/server/utils/rotation/helpers'

describe('shuffleArray', () => {
  it('returns a new array with the same elements', () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(original)
    expect(shuffled).toHaveLength(original.length)
    expect(shuffled.sort()).toEqual(original.sort())
  })

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5]
    const copy = [...original]
    shuffleArray(original)
    expect(original).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([])
  })

  it('handles single-element array', () => {
    expect(shuffleArray([42])).toEqual([42])
  })

  it('produces different orderings over many runs', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(shuffleArray(original).join(','))
    }
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('selectBalanced', () => {
  it('returns all candidates when count >= candidates.length', () => {
    const candidates = ['a', 'b', 'c']
    const counts = new Map<string, number>()
    const result = selectBalanced(candidates, 5, counts)
    expect(result).toHaveLength(3)
    expect(result.sort()).toEqual(['a', 'b', 'c'])
  })

  it('selects candidates with lowest assignment counts', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e']
    const counts = new Map([
      ['a', 5],
      ['b', 1],
      ['c', 0],
      ['d', 3],
      ['e', 0],
    ])
    const selections = new Map<string, number>()
    for (let i = 0; i < 200; i++) {
      const result = selectBalanced(candidates, 2, counts)
      for (const id of result) {
        selections.set(id, (selections.get(id) ?? 0) + 1)
      }
    }
    // c and e have count 0 — they should be selected most often
    expect(selections.get('c')).toBeGreaterThan(selections.get('a') ?? 0)
    expect(selections.get('e')).toBeGreaterThan(selections.get('a') ?? 0)
  })

  it('returns exactly count items', () => {
    const candidates = ['a', 'b', 'c', 'd']
    const counts = new Map<string, number>()
    const result = selectBalanced(candidates, 2, counts)
    expect(result).toHaveLength(2)
  })

  it('handles empty candidates', () => {
    const result = selectBalanced([], 3, new Map())
    expect(result).toEqual([])
  })
})
