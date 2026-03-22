import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('teams CRUD (smoke)', () => {
  let baseUrl: string
  let cookie: string
  let teamSlug: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('lists teams', async () => {
    const response = await authGet(baseUrl, '/api/teams', cookie)
    expect(response.status).toBe(200)
    const teams = await response.json()
    expect(Array.isArray(teams)).toBe(true)
    expect(teams.length).toBeGreaterThan(0)
    expect(typeof teams[0].id).toBe('string')
    expect(typeof teams[0].name).toBe('string')
    expect(typeof teams[0].slug).toBe('string')
    expect(typeof teams[0].memberCount).toBe('number')
  })

  it('creates a team', async () => {
    const response = await authPost(baseUrl, '/api/teams', cookie, {
      name: `Team${RUN}`,
      defaultReviewerCount: 3,
    })
    expect(response.status).toBe(200)
    const team = await response.json()
    expect(team.name).toBe(`Team${RUN}`)
    expect(team.defaultReviewerCount).toBe(3)
    expect(typeof team.id).toBe('string')
    expect(typeof team.slug).toBe('string')
    expect(team.slug.length).toBeGreaterThan(0)
    teamSlug = team.slug
  })

  it('gets a team by slug', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamSlug}`, cookie)
    expect(response.status).toBe(200)
    const team = await response.json()
    expect(team.name).toBe(`Team${RUN}`)
    expect(team.defaultReviewerCount).toBe(3)
    expect(team.slug).toBe(teamSlug)
  })

  it('updates a team', async () => {
    const response = await authPut(baseUrl, `/api/teams/${teamSlug}`, cookie, {
      name: `TeamUpd${RUN}`,
      defaultReviewerCount: 1,
    })
    expect(response.status).toBe(200)
    const team = await response.json()
    expect(team.name).toBe(`TeamUpd${RUN}`)
    expect(team.defaultReviewerCount).toBe(1)
    expect(typeof team.slug).toBe('string')
    teamSlug = team.slug
  })

  it('deletes a team and confirms removal', async () => {
    const response = await authDelete(baseUrl, `/api/teams/${teamSlug}`, cookie)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)

    const getResponse = await authGet(baseUrl, `/api/teams/${teamSlug}`, cookie)
    expect(getResponse.status).toBe(404)
  })

  it('rejects team creation without auth', async () => {
    const response = await fetch(`${baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Team' }),
    })
    expect(response.status).toBe(401)
  })
})
