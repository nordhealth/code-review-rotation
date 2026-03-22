import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('validation errors (regression)', () => {
  let baseUrl: string
  let cookie: string
  let teamSlug: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    const response = await fetch(`${baseUrl}/api/teams`, { headers: { Cookie: cookie } })
    const teams = await response.json()
    teamSlug = teams[0].slug
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- Auth validation ---

  it('rejects login with missing email', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'somepass' }),
    })
    expect(response.status).toBe(400)
  })

  it('rejects login with missing password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@nordhealth.com' }),
    })
    expect(response.status).toBe(400)
  })

  it('rejects registration with missing firstName', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing.name@nordhealth.com',
        password: 'securepass123!',
        lastName: 'Test',
      }),
    })
    expect(response.status).toBe(400)
  })

  it('rejects registration with missing lastName', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing.last@nordhealth.com',
        password: 'securepass123!',
        firstName: 'Test',
      }),
    })
    expect(response.status).toBe(400)
  })

  // --- Developer validation ---

  it('rejects developer creation with missing firstName', async () => {
    const response = await authPost(baseUrl, '/api/developers', cookie, {
      lastName: 'OnlyLast',
    })
    expect(response.status).toBe(400)
  })

  it('rejects developer creation with missing lastName', async () => {
    const response = await authPost(baseUrl, '/api/developers', cookie, {
      firstName: 'OnlyFirst',
    })
    expect(response.status).toBe(400)
  })

  // --- Team validation ---

  it('rejects team creation with missing name', async () => {
    const response = await authPost(baseUrl, '/api/teams', cookie, {
      defaultReviewerCount: 2,
    })
    expect(response.status).toBe(400)
  })

  it('rejects team update with invalid rotationDay', async () => {
    const response = await authPut(baseUrl, `/api/teams/${teamSlug}`, cookie, {
      rotationDay: 'notaday',
    })
    expect(response.status).toBe(400)
  })

  it('rejects settings update with negative interval', async () => {
    const response = await authPut(baseUrl, '/api/settings', cookie, {
      defaultRotationIntervalDays: -1,
    })
    expect(response.status).toBe(400)
  })

  it('rejects settings update with interval exceeding max', async () => {
    const response = await authPut(baseUrl, '/api/settings', cookie, {
      defaultRotationIntervalDays: 91,
    })
    expect(response.status).toBe(400)
  })

  // --- Squad validation ---

  it('rejects squad creation with missing name', async () => {
    const response = await authPost(baseUrl, `/api/teams/${teamSlug}/squads`, cookie, {
      reviewerCount: 2,
      memberDeveloperIds: [],
    })
    expect(response.status).toBe(400)
  })
})
