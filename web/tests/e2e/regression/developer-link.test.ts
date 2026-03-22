import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authGet, authPut, loginAsAdmin } from '../helpers'
import { queryTestDb, registerAndConfirmUser, startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('developer link — /api/developers/me (regression)', () => {
  let baseUrl: string
  let adminCookie: string
  let devCookie: string
  let joaoDeveloperId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    adminCookie = await loginAsAdmin(baseUrl)

    // Get a seed developer's ID (João Gonçalves)
    const devResponse = await authGet(baseUrl, '/api/developers/joao-goncalves', adminCookie)
    const developer = await devResponse.json()
    joaoDeveloperId = developer.id

    // Register a non-admin user
    devCookie = await registerAndConfirmUser(
      baseUrl,
      `devlink.${RUN}@nordhealth.com`,
      'devpass123!',
      'DevLink',
      'Test',
    )
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // --- GET /api/developers/me ---

  it('returns null developerSlug for unlinked user', async () => {
    const response = await authGet(baseUrl, '/api/developers/me', devCookie)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.developerSlug).toBeNull()
  })

  it('rejects unauthenticated GET /api/developers/me', async () => {
    const response = await fetch(`${baseUrl}/api/developers/me`)
    expect(response.status).toBe(401)
  })

  // --- PUT /api/developers/me ---

  it('rejects unauthenticated PUT /api/developers/me', async () => {
    const response = await fetch(`${baseUrl}/api/developers/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ developerId: joaoDeveloperId }),
    })
    expect(response.status).toBe(401)
  })

  it('rejects linking to non-existent developer', async () => {
    const response = await authPut(baseUrl, '/api/developers/me', devCookie, {
      developerId: 'nonexistent-id',
    })
    expect(response.status).toBe(404)
  })

  it('rejects empty developerId', async () => {
    const response = await authPut(baseUrl, '/api/developers/me', devCookie, {
      developerId: '',
    })
    expect(response.status).toBe(400)
  })

  it('links user to developer profile and returns slug', async () => {
    const response = await authPut(baseUrl, '/api/developers/me', devCookie, {
      developerId: joaoDeveloperId,
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.developerSlug).toBe('joao-goncalves')
  })

  it('persists developer_id in the database', async () => {
    const rows = await queryTestDb(
      'SELECT developer_id FROM users WHERE email = ?',
      [`devlink.${RUN}@nordhealth.com`],
    )
    expect(rows.length).toBe(1)
    expect(rows[0].developer_id).toBe(joaoDeveloperId)
  })

  it('returns slug from GET /api/developers/me after linking', async () => {
    const response = await authGet(baseUrl, '/api/developers/me', devCookie)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.developerSlug).toBe('joao-goncalves')
  })

  // --- Session includes developerSlug after re-login ---

  it('login session includes developerSlug after linking', async () => {
    // Re-login to get fresh session
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `devlink.${RUN}@nordhealth.com`,
        password: 'devpass123!',
      }),
    })
    expect(loginResponse.status).toBe(200)

    // Use new session to check /api/developers/me
    const newCookie = loginResponse.headers.get('set-cookie')?.split(';')[0] ?? ''
    const meResponse = await authGet(baseUrl, '/api/developers/me', newCookie)
    expect(meResponse.status).toBe(200)
    const data = await meResponse.json()
    expect(data.developerSlug).toBe('joao-goncalves')
  })

  // --- Admin user session also gets developerSlug ---

  it('admin session includes developerSlug when linked via DB', async () => {
    // The seed admin (joao.goncalves@nordhealth.com) is NOT linked by default.
    // Verify it starts as null.
    const meResponse = await authGet(baseUrl, '/api/developers/me', adminCookie)
    expect(meResponse.status).toBe(200)
    const data = await meResponse.json()
    expect(data.developerSlug).toBeNull()
  })

  it('admin can link themselves to a developer', async () => {
    const response = await authPut(baseUrl, '/api/developers/me', adminCookie, {
      developerId: joaoDeveloperId,
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.developerSlug).toBe('joao-goncalves')
  })

  // --- Admin users list includes developer link info ---

  it('admin users list includes developer name for linked users', async () => {
    const response = await authGet(baseUrl, '/api/users', adminCookie)
    expect(response.status).toBe(200)
    const usersList = await response.json()
    expect(Array.isArray(usersList)).toBe(true)

    // Find the user we linked above
    const linkedUser = usersList.find(
      (user: { email: string }) => user.email === `devlink.${RUN}@nordhealth.com`,
    )
    expect(linkedUser).toBeDefined()
    expect(linkedUser.developerId).toBe(joaoDeveloperId)
    expect(linkedUser.developerName).toBe('João')
    expect(linkedUser.developerLastName).toBe('Gonçalves')
  })

  it('admin users list shows null developer fields for unlinked users', async () => {
    // Register a user who stays unlinked
    await registerAndConfirmUser(
      baseUrl,
      `unlinked.${RUN}@nordhealth.com`,
      'unlinked123!',
      'Unlinked',
      'User',
    )

    const response = await authGet(baseUrl, '/api/users', adminCookie)
    const usersList = await response.json()
    const unlinkedUser = usersList.find(
      (user: { email: string }) => user.email === `unlinked.${RUN}@nordhealth.com`,
    )
    expect(unlinkedUser).toBeDefined()
    expect(unlinkedUser.developerId).toBeNull()
    expect(unlinkedUser.developerName).toBeNull()
    expect(unlinkedUser.developerLastName).toBeNull()
  })
})
