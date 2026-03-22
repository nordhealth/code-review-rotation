import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authGet, loginAsAdmin } from '../helpers'
import { registerAndConfirmUser, startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('non-admin authorization (regression)', () => {
  let baseUrl: string
  let devCookie: string
  let teamSlug: string
  let memberId: string
  let squadId: string
  let rotationId: string
  let assignmentId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    devCookie = await registerAndConfirmUser(
      baseUrl,
      `authz.dev.${RUN}@nordhealth.com`,
      'devpass123!',
      'AuthzDev',
      'Test',
    )

    // Get seed data IDs for testing write operations
    const adminCookie = await loginAsAdmin(baseUrl)
    const teamsResponse = await authGet(baseUrl, '/api/teams', adminCookie)
    const teams = await teamsResponse.json()
    teamSlug = teams[0].slug

    const membersResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, adminCookie)
    const members = await membersResponse.json()
    memberId = members[0].id

    const squadsResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/squads`, adminCookie)
    const squads = await squadsResponse.json()
    squadId = squads[0].id

    const rotationsResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/rotations`, adminCookie)
    const rotations = await rotationsResponse.json()
    rotationId = rotations[0].id
    assignmentId = rotations[0].assignments[0]?.id
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- Read access (should be allowed) ---

  it('non-admin can read teams', async () => {
    const response = await fetch(`${baseUrl}/api/teams`, { headers: { Cookie: devCookie } })
    expect(response.status).toBe(200)
  })

  it('non-admin can read developers', async () => {
    const response = await fetch(`${baseUrl}/api/developers`, { headers: { Cookie: devCookie } })
    expect(response.status).toBe(200)
  })

  // --- Developer mutations ---

  it('non-admin cannot create a developer', async () => {
    const response = await fetch(`${baseUrl}/api/developers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ firstName: 'Blocked', lastName: 'Dev' }),
    })
    expect(response.status).toBe(403)
  })

  // --- Team mutations ---

  it('non-admin cannot create a team', async () => {
    const response = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ name: 'Blocked Team' }),
    })
    expect(response.status).toBe(403)
  })

  // --- Settings ---

  it('non-admin cannot update settings', async () => {
    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ defaultRotationIntervalDays: 7 }),
    })
    expect(response.status).toBe(403)
  })

  // --- Rotations ---

  it('non-admin cannot create rotations', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/rotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ mode: 'devs', isManual: true }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot edit rotation assignments', async () => {
    if (!assignmentId)
      return // skip if no assignments in seed
    const response = await fetch(
      `${baseUrl}/api/teams/${teamSlug}/rotations/${rotationId}/assignments/${assignmentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
        body: JSON.stringify({ reviewerDeveloperIds: [] }),
      },
    )
    expect(response.status).toBe(403)
  })

  // --- Members ---

  it('non-admin cannot update team members', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ isExperienced: false }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot remove team members', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/members/${memberId}`, {
      method: 'DELETE',
      headers: { Cookie: devCookie },
    })
    expect(response.status).toBe(403)
  })

  // --- Squads ---

  it('non-admin cannot update squads', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/squads/${squadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ name: 'Blocked Update' }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot delete squads', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/squads/${squadId}`, {
      method: 'DELETE',
      headers: { Cookie: devCookie },
    })
    expect(response.status).toBe(403)
  })

  // --- Users ---

  it('non-admin cannot invite users', async () => {
    const response = await fetch(`${baseUrl}/api/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ email: 'blocked@nordhealth.com' }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot change user roles', async () => {
    const response = await fetch(`${baseUrl}/api/users/some-user-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(response.status).toBe(403)
  })

  // --- Webhooks ---

  it('non-admin cannot create webhooks', async () => {
    const response = await fetch(`${baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ name: 'Blocked Hook', url: 'https://example.com' }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot update webhooks', async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/some-webhook-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': devCookie },
      body: JSON.stringify({ active: false }),
    })
    expect(response.status).toBe(403)
  })

  it('non-admin cannot delete webhooks', async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/some-webhook-id`, {
      method: 'DELETE',
      headers: { Cookie: devCookie },
    })
    expect(response.status).toBe(403)
  })
})
