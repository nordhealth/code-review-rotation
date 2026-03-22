import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('team members management (regression)', () => {
  let baseUrl: string
  let cookie: string
  let teamSlug: string
  let newDevId: string
  let memberId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    // Get the seed team
    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    teamSlug = teams[0].slug

    // Create a new developer to add as member
    const devResponse = await authPost(baseUrl, '/api/developers', cookie, {
      firstName: `Member${RUN}`,
      lastName: 'Tester',
    })
    const dev = await devResponse.json()
    newDevId = dev.id
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('lists current team members', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, cookie)
    expect(response.status).toBe(200)
    const members = await response.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
    expect(members[0]).toHaveProperty('developerId')
    expect(members[0]).toHaveProperty('isExperienced')
  })

  it('adds a developer as team member', async () => {
    const response = await authPost(baseUrl, `/api/teams/${teamSlug}/members`, cookie, {
      developerId: newDevId,
      isExperienced: false,
    })
    expect(response.status).toBe(200)
    const member = await response.json()
    expect(member.developerId).toBe(newDevId)
    expect(member.isExperienced).toBe(false)
    memberId = member.id
  })

  it('updates member experience level', async () => {
    const response = await authPut(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie, {
      isExperienced: true,
    })
    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated.isExperienced).toBe(true)
  })

  it('removes a member from the team', async () => {
    const response = await authDelete(baseUrl, `/api/teams/${teamSlug}/members/${memberId}`, cookie)
    expect(response.status).toBe(200)

    const listResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, cookie)
    const members = await listResponse.json()
    const found = members.find((member: { id: string }) => member.id === memberId)
    expect(found).toBeUndefined()
  })
})
