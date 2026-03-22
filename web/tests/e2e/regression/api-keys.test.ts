import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('aPI keys and public endpoint (regression)', () => {
  let baseUrl: string
  let cookie: string
  let apiKey: string
  let keyId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('creates an API key', async () => {
    const response = await authPost(baseUrl, '/api/keys', cookie, {
      name: 'E2E Test Key',
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.name).toBe('E2E Test Key')
    expect(typeof data.id).toBe('string')
    expect(data.plainKey).toBeTruthy()
    expect(data.plainKey).toMatch(/^rl_/)
    expect(data.keyPrefix).toBe(data.plainKey.slice(0, 11))
    apiKey = data.plainKey
    keyId = data.id
  })

  it('lists API keys without exposing secrets', async () => {
    const response = await authGet(baseUrl, '/api/keys', cookie)
    expect(response.status).toBe(200)
    const keys = await response.json()
    expect(keys.length).toBeGreaterThan(0)
    const key = keys.find((candidate: { id: string }) => candidate.id === keyId)
    expect(key).toBeTruthy()
    expect(key.name).toBe('E2E Test Key')
    expect(key).not.toHaveProperty('plainKey')
    expect(key).not.toHaveProperty('keyHash')
  })

  it('accesses public rotations with API key', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    expect(Array.isArray(rotations)).toBe(true)
    // Verify rotation objects have expected shape
    if (rotations.length > 0) {
      expect(rotations[0]).toHaveProperty('id')
      expect(rotations[0]).toHaveProperty('mode')
      expect(rotations[0]).toHaveProperty('assignments')
    }
  })

  it('filters public rotations by mode', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations?mode=devs`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    expect(Array.isArray(rotations)).toBe(true)
    // Guard against empty results silently passing
    expect(rotations.length).toBeGreaterThan(0)
    for (const rotation of rotations) {
      expect(rotation.mode).toBe('devs')
    }
  })

  it('rejects public rotations without API key', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations`)
    expect(response.status).toBe(401)
  })

  it('rejects public rotations with invalid API key', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations`, {
      headers: { Authorization: 'Bearer rl_invalid_key_here' },
    })
    expect(response.status).toBe(401)
  })

  it('revokes an API key and verifies it stops working', async () => {
    const response = await authDelete(baseUrl, `/api/keys/${keyId}`, cookie)
    expect(response.status).toBe(200)

    // Verify key is gone from the list
    const listResponse = await authGet(baseUrl, '/api/keys', cookie)
    const keys = await listResponse.json()
    const found = keys.find((candidate: { id: string }) => candidate.id === keyId)
    expect(found).toBeUndefined()

    // Revoked key should no longer work for public API
    const publicResponse = await fetch(`${baseUrl}/api/public/rotations`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(publicResponse.status).toBe(401)
  })
})
