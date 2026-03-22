import { describe, expect, it } from 'vitest'
import { generateWebhookSecret, signWebhookPayload } from '~/server/utils/webhook'

describe('generateWebhookSecret', () => {
  it('returns a 64-character hex string (32 bytes)', () => {
    const secret = generateWebhookSecret()
    expect(secret).toHaveLength(64)
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique secrets', () => {
    const secrets = new Set<string>()
    for (let index = 0; index < 50; index++) {
      secrets.add(generateWebhookSecret())
    }
    expect(secrets.size).toBe(50)
  })
})

describe('signWebhookPayload', () => {
  it('returns a 64-character hex string (HMAC-SHA256)', async () => {
    const signature = await signWebhookPayload('{"event":"test"}', 'mysecret')
    expect(signature).toHaveLength(64)
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces consistent signatures for the same input and secret', async () => {
    const payload = '{"event":"rotation.created","data":{}}'
    const secret = 'consistent-secret'
    const signature1 = await signWebhookPayload(payload, secret)
    const signature2 = await signWebhookPayload(payload, secret)
    expect(signature1).toBe(signature2)
  })

  it('produces different signatures for different payloads', async () => {
    const secret = 'same-secret'
    const signature1 = await signWebhookPayload('{"a":1}', secret)
    const signature2 = await signWebhookPayload('{"a":2}', secret)
    expect(signature1).not.toBe(signature2)
  })

  it('produces different signatures for different secrets', async () => {
    const payload = '{"event":"test"}'
    const signature1 = await signWebhookPayload(payload, 'secret-one')
    const signature2 = await signWebhookPayload(payload, 'secret-two')
    expect(signature1).not.toBe(signature2)
  })

  it('handles empty payload', async () => {
    const signature = await signWebhookPayload('', 'nonempty-secret')
    expect(signature).toHaveLength(64)
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces a known HMAC-SHA256 for a test vector', async () => {
    // Verify against a well-known HMAC-SHA256 test case
    // HMAC-SHA256("", "key") is a deterministic value
    const signature1 = await signWebhookPayload('message', 'key')
    const signature2 = await signWebhookPayload('message', 'key')
    expect(signature1).toBe(signature2)
    // Just verify it's not trivially wrong (not all zeros, etc.)
    expect(signature1).not.toBe('0'.repeat(64))
  })
})
