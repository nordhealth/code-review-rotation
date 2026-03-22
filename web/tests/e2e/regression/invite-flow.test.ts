import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('invite flow (regression)', () => {
  let baseUrl: string
  let adminCookie: string
  const inviteEmail = `invite.${RUN}@nordhealth.com`

  beforeAll(async () => {
    baseUrl = await startServer()
    adminCookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('admin can invite a user with valid domain', async () => {
    const response = await fetch(`${baseUrl}/api/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ email: inviteEmail }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain(inviteEmail)
  })

  it('admin cannot invite a user with invalid domain', async () => {
    const response = await fetch(`${baseUrl}/api/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ email: 'hacker@evil.com' }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.statusMessage).toContain('nordhealth.com')
  })

  it('unauthenticated user cannot invite', async () => {
    const response = await fetch(`${baseUrl}/api/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'another@nordhealth.com' }),
    })
    expect(response.status).toBe(401)
  })

  it('admin cannot invite an already registered email', async () => {
    const response = await fetch(`${baseUrl}/api/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ email: 'joao.goncalves@nordhealth.com' }),
    })
    expect(response.status).toBe(409)
    const data = await response.json()
    expect(data.statusMessage).toContain('already')
  })

  it('admin can list all users', async () => {
    const response = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: adminCookie },
    })
    expect(response.status).toBe(200)
    const users = await response.json()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
    expect(typeof users[0].email).toBe('string')
    expect(typeof users[0].role).toBe('string')
    expect(users[0]).toHaveProperty('id')
  })

  it('admin can toggle user role', async () => {
    // Register a user first (will be unconfirmed but should appear in admin list)
    const devEmail = `roletest.${RUN}@nordhealth.com`
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: devEmail,
        password: 'devpass123!',
        firstName: 'Role',
        lastName: 'Test',
      }),
    })

    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: adminCookie },
    })
    const users = await usersResponse.json()
    const devUser = users.find((user: { email: string }) => user.email === devEmail)

    // Must find the user — fail explicitly if not found
    expect(devUser).toBeDefined()

    const response = await fetch(`${baseUrl}/api/users/${devUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated.role).toBe('admin')
  })
})
