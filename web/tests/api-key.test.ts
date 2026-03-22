import { describe, expect, it } from 'vitest'
import { extractKeyPrefix, generateApiKey, hashApiKey } from '~/server/utils/api-key'

describe('generateApiKey', () => {
  it('returns a string starting with rl_ prefix', () => {
    const key = generateApiKey()
    expect(key.startsWith('rl_')).toBe(true)
  })

  it('returns a 51-character key (3 prefix + 48 hex)', () => {
    const key = generateApiKey()
    expect(key).toHaveLength(51)
  })

  it('contains only valid hex characters after prefix', () => {
    const key = generateApiKey()
    const hex = key.slice(3)
    expect(hex).toMatch(/^[0-9a-f]{48}$/)
  })

  it('generates unique keys', () => {
    const keys = new Set<string>()
    for (let index = 0; index < 100; index++) {
      keys.add(generateApiKey())
    }
    expect(keys.size).toBe(100)
  })
})

describe('extractKeyPrefix', () => {
  it('returns first 11 characters', () => {
    const key = 'rl_abcdef1234567890abcdef1234567890abcdef12345678'
    expect(extractKeyPrefix(key)).toBe('rl_abcdef12')
  })

  it('returns correct prefix for a generated key', () => {
    const key = generateApiKey()
    const prefix = extractKeyPrefix(key)
    expect(prefix).toHaveLength(11)
    expect(key.startsWith(prefix)).toBe(true)
  })
})

describe('hashApiKey', () => {
  it('returns a 64-character hex string (SHA-256)', async () => {
    const hash = await hashApiKey('rl_test1234')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces consistent hashes for the same input', async () => {
    const key = 'rl_consistenttest'
    const hash1 = await hashApiKey(key)
    const hash2 = await hashApiKey(key)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', async () => {
    const hash1 = await hashApiKey('rl_key_one')
    const hash2 = await hashApiKey('rl_key_two')
    expect(hash1).not.toBe(hash2)
  })

  it('is not reversible (hash differs from input)', async () => {
    const key = 'rl_mykey'
    const hash = await hashApiKey(key)
    expect(hash).not.toBe(key)
    expect(hash).not.toContain('rl_')
  })
})
