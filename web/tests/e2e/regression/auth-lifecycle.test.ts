import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()
const TEST_EMAIL = `lifecycle.${RUN}@nordhealth.com`

describe.skipIf(!isE2E)('auth lifecycle (regression)', () => {
  let baseUrl: string
  let adminCookie: string

  beforeAll(async () => {
    baseUrl = await startServer()
    adminCookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- Registration ---

  it('registers a new user', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'securepass123!',
        firstName: 'Lifecycle',
        lastName: 'Test',
      }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('check your email')
  })

  it('rejects login for unconfirmed user', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'securepass123!' }),
    })
    expect(response.status).toBe(403)
  })

  // --- Confirmation ---

  it('rejects confirmation with invalid token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token-12345' }),
    })
    expect(response.status).toBe(400)
  })

  // --- Forgot / reset password ---

  it('accepts forgot password for existing email', async () => {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'joao.goncalves@nordhealth.com' }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('reset link')
  })

  it('does not reveal non-existing emails (no user enumeration)', async () => {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@nordhealth.com' }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('reset link')
  })

  it('rejects reset password with invalid token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bad-token', password: 'newpass123!' }),
    })
    expect(response.status).toBe(400)
  })

  // --- Change password ---

  it('rejects change password without auth', async () => {
    const response = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'admin123!', newPassword: 'newpass123!' }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects change password with wrong current password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'another123!' }),
    })
    expect(response.status).toBe(401)
  })

  // --- Logout ---

  it('logs out successfully', async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
  })
})
