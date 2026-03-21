import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOMAINS,
  generateToken,
  isAllowedEmail,
  TOKEN_EXPIRY_HOURS,
  tokenExpiresAt,
} from '~/server/utils/auth-constants'

describe('auth-constants', () => {
  describe('aLLOWED_DOMAINS', () => {
    it('includes nordhealth.com and provet.com', () => {
      expect(ALLOWED_DOMAINS).toContain('nordhealth.com')
      expect(ALLOWED_DOMAINS).toContain('provet.com')
    })

    it('has exactly 2 domains', () => {
      expect(ALLOWED_DOMAINS).toHaveLength(2)
    })
  })

  describe('isAllowedEmail', () => {
    it('accepts @nordhealth.com emails', () => {
      expect(isAllowedEmail('joao.goncalves@nordhealth.com')).toBe(true)
      expect(isAllowedEmail('test@nordhealth.com')).toBe(true)
    })

    it('accepts @provet.com emails', () => {
      expect(isAllowedEmail('dev@provet.com')).toBe(true)
      expect(isAllowedEmail('a@provet.com')).toBe(true)
    })

    it('rejects other domains', () => {
      expect(isAllowedEmail('user@gmail.com')).toBe(false)
      expect(isAllowedEmail('user@outlook.com')).toBe(false)
      expect(isAllowedEmail('user@example.com')).toBe(false)
    })

    it('rejects emails with domain as substring', () => {
      expect(isAllowedEmail('user@notnordhealth.com')).toBe(false)
      expect(isAllowedEmail('user@fakeprovet.com')).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(isAllowedEmail('')).toBe(false)
    })

    it('rejects strings without @', () => {
      expect(isAllowedEmail('nordhealth.com')).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('returns a 64-character hex string', () => {
      const token = generateToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('generates unique tokens', () => {
      const tokens = new Set<string>()
      for (let index = 0; index < 100; index++)
        tokens.add(generateToken())
      expect(tokens.size).toBe(100)
    })
  })

  describe('tokenExpiresAt', () => {
    it('returns a date in the future', () => {
      const now = Date.now()
      const expires = tokenExpiresAt()
      expect(expires.getTime()).toBeGreaterThan(now)
    })

    it('defaults to TOKEN_EXPIRY_HOURS hours from now', () => {
      const now = Date.now()
      const expires = tokenExpiresAt()
      const diffMs = expires.getTime() - now
      const diffHours = diffMs / (1000 * 60 * 60)
      // Allow 1 second tolerance
      expect(diffHours).toBeCloseTo(TOKEN_EXPIRY_HOURS, 1)
    })

    it('accepts custom hours', () => {
      const now = Date.now()
      const expires = tokenExpiresAt(1)
      const diffMs = expires.getTime() - now
      const diffHours = diffMs / (1000 * 60 * 60)
      expect(diffHours).toBeCloseTo(1, 1)
    })

    it('works with 0 hours', () => {
      const now = Date.now()
      const expires = tokenExpiresAt(0)
      const diffMs = Math.abs(expires.getTime() - now)
      expect(diffMs).toBeLessThan(1000)
    })
  })
})
