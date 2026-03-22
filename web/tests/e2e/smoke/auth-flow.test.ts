import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('auth flow (smoke)', () => {
  let baseUrl: string
  const testEmail = `smoke.${Date.now()}@nordhealth.com`

  beforeAll(async () => {
    baseUrl = await startServer()
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('rejects login with invalid credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nordhealth.com', password: 'wrong' }),
    })
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.statusMessage).toBe('Invalid email or password')
  })

  it('allows login and returns session cookie', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'joao.goncalves@nordhealth.com', password: 'admin123!' }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.user.email).toBe('joao.goncalves@nordhealth.com')
    expect(typeof data.user.id).toBe('string')

    // Verify session cookie is set
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('nuxt-session')
  })

  it('rejects registration with non-allowed domain', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@gmail.com',
        password: 'securepass123',
        firstName: 'Test',
        lastName: 'User',
      }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.statusMessage).toContain('nordhealth.com')
  })

  it('rejects registration with short password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `shortpw.${Date.now()}@nordhealth.com`,
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      }),
    })
    expect(response.status).toBe(400)
  })

  it('registers a new user with allowed domain', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpass123!',
        firstName: 'Smoke',
        lastName: 'Test',
      }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(typeof data.message).toBe('string')
    expect(data.message).toContain('check your email')
  })

  it('rejects login for unconfirmed user', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'testpass123!' }),
    })
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.statusMessage).toContain('confirm')
  })

  it('rejects duplicate registration', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'anotherpass123',
        firstName: 'Dupe',
        lastName: 'User',
      }),
    })
    expect(response.status).toBe(409)
    const data = await response.json()
    expect(data.statusMessage).toContain('already exists')
  })

  it('rejects unauthenticated access to protected endpoints', async () => {
    const response = await fetch(`${baseUrl}/api/teams`)
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated access to public rotations without API key', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations`)
    expect(response.status).toBe(401)
  })
})
