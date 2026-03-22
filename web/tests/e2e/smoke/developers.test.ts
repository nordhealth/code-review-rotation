import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('developers CRUD (smoke)', () => {
  let baseUrl: string
  let cookie: string
  let createdDevId: string
  let createdDevSlug: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('lists developers', async () => {
    const response = await authGet(baseUrl, '/api/developers', cookie)
    expect(response.status).toBe(200)
    const devs = await response.json()
    expect(Array.isArray(devs)).toBe(true)
    expect(devs.length).toBeGreaterThan(0)
    expect(typeof devs[0].id).toBe('string')
    expect(typeof devs[0].firstName).toBe('string')
    expect(typeof devs[0].slug).toBe('string')
  })

  it('rejects unauthenticated developer creation', async () => {
    const response = await fetch(`${baseUrl}/api/developers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Unauth', lastName: 'Dev' }),
    })
    expect(response.status).toBe(401)
  })

  it('creates a developer with GitHub ID', async () => {
    const response = await authPost(baseUrl, '/api/developers', cookie, {
      firstName: `DevSmoke${RUN}`,
      lastName: 'Tester',
      slackId: 'U_TEST',
      gitlabId: 'test.dev',
      githubId: 'test-dev-gh',
    })
    expect(response.status).toBe(200)
    const dev = await response.json()
    expect(dev.firstName).toBe(`DevSmoke${RUN}`)
    expect(dev.lastName).toBe('Tester')
    expect(dev.githubId).toBe('test-dev-gh')
    expect(dev.slackId).toBe('U_TEST')
    expect(typeof dev.id).toBe('string')
    expect(typeof dev.slug).toBe('string')
    expect(dev.slug.length).toBeGreaterThan(0)
    createdDevId = dev.id
    createdDevSlug = dev.slug
  })

  it('gets a developer by slug', async () => {
    const response = await authGet(baseUrl, `/api/developers/${createdDevSlug}`, cookie)
    expect(response.status).toBe(200)
    const dev = await response.json()
    expect(dev.id).toBe(createdDevId)
    expect(dev.firstName).toBe(`DevSmoke${RUN}`)
  })

  it('returns 404 for non-existent developer', async () => {
    const response = await authGet(baseUrl, '/api/developers/nonexistent-slug', cookie)
    expect(response.status).toBe(404)
  })

  it('updates a developer', async () => {
    const response = await authPut(baseUrl, `/api/developers/${createdDevId}`, cookie, {
      firstName: `Updated${RUN}`,
      githubId: 'updated-gh',
    })
    expect(response.status).toBe(200)
    const dev = await response.json()
    expect(dev.firstName).toBe(`Updated${RUN}`)
    expect(dev.githubId).toBe('updated-gh')
    // Slug should have changed with the name
    expect(dev.slug).not.toBe(createdDevSlug)
    createdDevSlug = dev.slug
  })

  it('gets developer associations with correct structure', async () => {
    const response = await authGet(baseUrl, `/api/developers/${createdDevSlug}/associations`, cookie)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.assignedToMe)).toBe(true)
    expect(Array.isArray(data.reviewingOthers)).toBe(true)
    expect(Array.isArray(data.memberOf)).toBe(true)
    expect(Array.isArray(data.memberOfSquads)).toBe(true)
  })

  it('handles diacritics in slugs correctly', async () => {
    const response = await authPost(baseUrl, '/api/developers', cookie, {
      firstName: `José${RUN}`,
      lastName: 'Müller',
    })
    expect(response.status).toBe(200)
    const dev = await response.json()
    expect(dev.slug).toContain('muller')
    expect(dev.firstName).toBe(`José${RUN}`)
  })

  it('deletes a developer', async () => {
    const response = await authDelete(baseUrl, `/api/developers/${createdDevId}`, cookie)
    expect(response.status).toBe(200)

    // Verify the developer is actually gone
    const getResponse = await authGet(baseUrl, `/api/developers/${createdDevSlug}`, cookie)
    expect(getResponse.status).toBe(404)
  })
})
