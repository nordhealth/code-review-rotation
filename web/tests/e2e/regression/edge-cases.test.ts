import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { queryTestDb, startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('edge cases (regression)', () => {
  let baseUrl: string
  let cookie: string
  let apiKey: string
  let teamSlug: string
  let teamId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    teamSlug = teams[0].slug
    teamId = teams[0].id

    const keyResponse = await authPost(baseUrl, '/api/keys', cookie, { name: `EdgeKey${RUN}` })
    const keyData = await keyResponse.json()
    apiKey = keyData.plainKey
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- 404 on non-existent primary resources ---

  it('returns 404 for updating non-existent developer', async () => {
    const response = await authPut(baseUrl, '/api/developers/nonexistent-id', cookie, { firstName: 'Ghost' })
    expect(response.status).toBe(404)
  })

  it('returns 404 for deleting non-existent developer', async () => {
    const response = await authDelete(baseUrl, '/api/developers/nonexistent-id', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for updating non-existent team', async () => {
    const response = await authPut(baseUrl, '/api/teams/nonexistent-slug', cookie, { name: 'Ghost' })
    expect(response.status).toBe(404)
  })

  it('returns 404 for deleting non-existent team', async () => {
    const response = await authDelete(baseUrl, '/api/teams/nonexistent-slug', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for rotation on non-existent team', async () => {
    const response = await authPost(baseUrl, '/api/teams/nonexistent/rotations', cookie, { mode: 'devs', isManual: true })
    expect(response.status).toBe(404)
  })

  // --- 404 on non-existent sub-resources ---

  it('returns 404 for members of non-existent team', async () => {
    const response = await authGet(baseUrl, '/api/teams/nonexistent/members', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for adding member to non-existent team', async () => {
    const response = await authPost(baseUrl, '/api/teams/nonexistent/members', cookie, { developerId: 'x' })
    expect(response.status).toBe(404)
  })

  it('returns 404 for updating non-existent member', async () => {
    const response = await authPut(baseUrl, `/api/teams/${teamSlug}/members/nonexistent`, cookie, { isExperienced: true })
    expect(response.status).toBe(404)
  })

  it('returns 404 for squads of non-existent team', async () => {
    const response = await authGet(baseUrl, '/api/teams/nonexistent/squads', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for creating squad in non-existent team', async () => {
    const response = await authPost(baseUrl, '/api/teams/nonexistent/squads', cookie, {
      name: 'Ghost',
      reviewerCount: 1,
      memberDeveloperIds: [],
    })
    expect(response.status).toBe(404)
  })

  it('returns 404 for non-existent squad', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamSlug}/squads/nonexistent`, cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for updating non-existent squad', async () => {
    const response = await authPut(baseUrl, `/api/teams/${teamSlug}/squads/nonexistent`, cookie, { name: 'Ghost' })
    expect(response.status).toBe(404)
  })

  it('returns 404 for rotations of non-existent team', async () => {
    const response = await authGet(baseUrl, '/api/teams/nonexistent/rotations', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for single rotation in non-existent team', async () => {
    const response = await authGet(baseUrl, '/api/teams/nonexistent/rotations/some-id', cookie)
    expect(response.status).toBe(404)
  })

  it('returns 404 for non-existent user role update', async () => {
    const response = await authPut(baseUrl, '/api/users/nonexistent-user-id', cookie, { role: 'admin' })
    expect(response.status).toBe(404)
  })

  it('returns 404 for associations of non-existent developer', async () => {
    const response = await authGet(baseUrl, '/api/developers/nonexistent/associations', cookie)
    expect(response.status).toBe(404)
  })

  // --- Duplicate / conflict ---

  it('rejects duplicate team name', async () => {
    const name = `DupeTeam${RUN}`
    const first = await authPost(baseUrl, '/api/teams', cookie, { name })
    expect(first.status).toBe(200)
    const second = await authPost(baseUrl, '/api/teams', cookie, { name })
    expect(second.status).toBeGreaterThanOrEqual(400)

    const firstData = await first.json()
    await authDelete(baseUrl, `/api/teams/${firstData.slug}`, cookie)
  })

  // --- Self-modification guard ---

  it('admin cannot change own role', async () => {
    // Get current admin user ID from the users list
    const usersResponse = await authGet(baseUrl, '/api/users', cookie)
    const users = await usersResponse.json()
    const admin = users.find((user: { email: string }) => user.email === 'joao.goncalves@nordhealth.com')
    expect(admin).toBeDefined()

    const response = await authPut(baseUrl, `/api/users/${admin.id}`, cookie, { role: 'developer' })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.statusMessage).toContain('own role')
  })

  // --- Token expiry ---

  it('rejects expired confirmation token', async () => {
    const email = `expired.confirm.${RUN}@nordhealth.com`
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!', firstName: 'Expired', lastName: 'Confirm' }),
    })

    // Get token and set expiry to the past
    const rows = await queryTestDb('SELECT confirmation_token FROM users WHERE email = ?', [email])
    const token = rows[0].confirmation_token as string
    await queryTestDb('UPDATE users SET confirmation_token_expires_at = ? WHERE email = ?', [0, email])

    const response = await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.statusMessage).toContain('expired')
  })

  it('rejects expired reset token', async () => {
    const email = `expired.reset.${RUN}@nordhealth.com`
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123!', firstName: 'Expired', lastName: 'Reset' }),
    })
    await queryTestDb('UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE email = ?', [email])

    await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const rows = await queryTestDb('SELECT reset_password_token FROM users WHERE email = ?', [email])
    const token = rows[0].reset_password_token as string
    await queryTestDb('UPDATE users SET reset_password_token_expires_at = ? WHERE email = ?', [0, email])

    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'newpass123!' }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.statusMessage).toContain('expired')
  })

  // --- Public API filters ---

  it('filters public rotations by teamId', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    for (const rotation of rotations) {
      expect(rotation.teamId).toBe(teamId)
    }
  })

  it('returns empty for non-existent teamId filter', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations?teamId=nonexistent`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  it('filters public rotations by mode=teams', async () => {
    const response = await fetch(`${baseUrl}/api/public/rotations?mode=teams`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    for (const rotation of rotations) {
      expect(rotation.mode).toBe('teams')
    }
  })

  it('filters public rotations by developerId', async () => {
    // Get a developer ID from seed data
    const devsResponse = await authGet(baseUrl, '/api/developers', cookie)
    const devs = await devsResponse.json()
    const developerId = devs[0].id

    const response = await fetch(`${baseUrl}/api/public/rotations?developerId=${developerId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    expect(Array.isArray(rotations)).toBe(true)
    // Every returned rotation should have at least one assignment involving this developer
    for (const rotation of rotations) {
      const involvesDev = rotation.assignments.some(
        (assignment: { targetId: string, reviewers: { id: string }[] }) =>
          assignment.targetId === developerId
          || assignment.reviewers.some((reviewer: { id: string }) => reviewer.id === developerId),
      )
      expect(involvesDev).toBe(true)
    }
  })

  it('filters public rotations by squadId', async () => {
    const squadsResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/squads`, cookie)
    const squads = await squadsResponse.json()
    const squadId = squads[0].id

    const response = await fetch(`${baseUrl}/api/public/rotations?squadId=${squadId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(response.status).toBe(200)
    const rotations = await response.json()
    expect(Array.isArray(rotations)).toBe(true)
    for (const rotation of rotations) {
      const involvesSquad = rotation.assignments.some(
        (assignment: { targetType: string, targetId: string }) =>
          assignment.targetType === 'squad' && assignment.targetId === squadId,
      )
      expect(involvesSquad).toBe(true)
    }
  })

  // --- Member edge cases ---

  it('updates member reviewerCount', async () => {
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, cookie)
    const members = await membersResponse.json()
    const memberId = members[0].id

    const response = await authPut(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie, { reviewerCount: 5 })
    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated.reviewerCount).toBe(5)

    await authPut(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie, { reviewerCount: null })
  })

  it('sets preferableReviewerIds on a member', async () => {
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, cookie)
    const members = await membersResponse.json()
    const memberId = members[0].id
    const otherDevId = members[1].developerId

    const response = await authPut(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie, {
      preferableReviewerIds: [otherDevId],
    })
    expect(response.status).toBe(200)

    await authPut(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie, { preferableReviewerIds: [] })
  })

  // --- Unauthenticated access ---

  it('rejects unauthenticated settings read', async () => {
    const response = await fetch(`${baseUrl}/api/settings`)
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated developer update', async () => {
    const response = await fetch(`${baseUrl}/api/developers/joao-goncalves`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Hacked' }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated developer delete', async () => {
    const response = await fetch(`${baseUrl}/api/developers/joao-goncalves`, { method: 'DELETE' })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated team update', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked' }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated team delete', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}`, { method: 'DELETE' })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated rotation creation', async () => {
    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/rotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'devs', isManual: true }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated squad GET by ID', async () => {
    const squadsResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/squads`, cookie)
    const squads = await squadsResponse.json()
    const squadId = squads[0].id

    const response = await fetch(`${baseUrl}/api/teams/${teamSlug}/squads/${squadId}`)
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated developer associations', async () => {
    const response = await fetch(`${baseUrl}/api/developers/joao-goncalves/associations`)
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated API key creation', async () => {
    const response = await fetch(`${baseUrl}/api/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Key' }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated API key deletion', async () => {
    const response = await fetch(`${baseUrl}/api/keys/some-id`, { method: 'DELETE' })
    expect(response.status).toBe(401)
  })
})
