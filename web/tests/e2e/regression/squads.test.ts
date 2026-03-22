import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()
const SQUAD_NAME = `Squad${RUN}`

describe.skipIf(!isE2E)('squads and members (regression)', () => {
  let baseUrl: string
  let cookie: string
  let teamId: string
  let squadId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    teamId = teams[0].id
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // Members
  it('lists team members', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamId}/members`, cookie)
    expect(response.status).toBe(200)
    const members = await response.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
    expect(typeof members[0].id).toBe('string')
    expect(typeof members[0].developerId).toBe('string')
    expect(typeof members[0].isExperienced).toBe('boolean')
    expect(members[0]).toHaveProperty('developer')
  })

  it('updates a member', async () => {
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamId}/members`, cookie)
    const members = await membersResponse.json()
    const memberId = members[0].id

    const response = await authPut(baseUrl, `/api/teams/${teamId}/members/${memberId}`, cookie, {
      reviewerCount: 3,
      isExperienced: true,
    })
    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated.isExperienced).toBe(true)
  })

  // Squads
  it('lists squads', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamId}/squads`, cookie)
    expect(response.status).toBe(200)
    const squads = await response.json()
    expect(Array.isArray(squads)).toBe(true)
    expect(squads.length).toBeGreaterThan(0)
    expect(typeof squads[0].name).toBe('string')
    expect(Array.isArray(squads[0].members)).toBe(true)
  })

  it('creates a squad', async () => {
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamId}/members`, cookie)
    const members = await membersResponse.json()
    const memberIds = members.slice(0, 3).map((member: { developerId: string }) => member.developerId)

    const response = await authPost(baseUrl, `/api/teams/${teamId}/squads`, cookie, {
      name: SQUAD_NAME,
      reviewerCount: 2,
      memberDeveloperIds: memberIds,
    })
    expect(response.status).toBe(200)
    const squad = await response.json()
    expect(squad.name).toBe(SQUAD_NAME)
    expect(squad.reviewerCount).toBe(2)
    expect(typeof squad.id).toBe('string')
    squadId = squad.id
  })

  it('gets a squad by ID', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamId}/squads/${squadId}`, cookie)
    expect(response.status).toBe(200)
    const squad = await response.json()
    expect(squad.name).toBe(SQUAD_NAME)
    expect(squad.members.length).toBe(3)
    expect(typeof squad.members[0].developer.id).toBe('string')
  })

  it('updates a squad', async () => {
    const updatedName = `${SQUAD_NAME}Upd`
    const response = await authPut(baseUrl, `/api/teams/${teamId}/squads/${squadId}`, cookie, {
      name: updatedName,
      reviewerCount: 1,
    })
    expect(response.status).toBe(200)
    const squad = await response.json()
    expect(squad.name).toBe(updatedName)
    expect(squad.reviewerCount).toBe(1)
  })

  it('creates a squad with schedule overrides', async () => {
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamId}/members`, cookie)
    const members = await membersResponse.json()
    const memberIds = members.slice(0, 2).map((member: { developerId: string }) => member.developerId)

    const response = await authPost(baseUrl, `/api/teams/${teamId}/squads`, cookie, {
      name: `Scheduled${RUN}`,
      reviewerCount: 1,
      memberDeveloperIds: memberIds,
      rotationIntervalDays: 7,
      rotationDay: 'friday',
      rotationTimezone: 'America/New_York',
    })
    expect(response.status).toBe(200)
    const squad = await response.json()
    expect(squad.rotationIntervalDays).toBe(7)
    expect(squad.rotationDay).toBe('friday')
    expect(squad.rotationTimezone).toBe('America/New_York')

    // Verify schedule fields are returned in list endpoint
    const listResponse = await authGet(baseUrl, `/api/teams/${teamId}/squads`, cookie)
    const squads = await listResponse.json()
    const found = squads.find((s: { name: string }) => s.name === `Scheduled${RUN}`)
    expect(found.rotationIntervalDays).toBe(7)
    expect(found.rotationDay).toBe('friday')

    // Clean up
    await authDelete(baseUrl, `/api/teams/${teamId}/squads/${squad.id}`, cookie)
  })

  it('updates squad schedule overrides and clears them', async () => {
    // Set schedule overrides
    const setResponse = await authPut(baseUrl, `/api/teams/${teamId}/squads/${squadId}`, cookie, {
      rotationIntervalDays: 21,
      rotationDay: 'monday',
    })
    expect(setResponse.status).toBe(200)
    const updated = await setResponse.json()
    expect(updated.rotationIntervalDays).toBe(21)
    expect(updated.rotationDay).toBe('monday')
    expect(updated.rotationTimezone).toBeNull()

    // Clear schedule overrides by sending null
    const clearResponse = await authPut(baseUrl, `/api/teams/${teamId}/squads/${squadId}`, cookie, {
      rotationIntervalDays: null,
      rotationDay: null,
    })
    expect(clearResponse.status).toBe(200)
    const cleared = await clearResponse.json()
    expect(cleared.rotationIntervalDays).toBeNull()
    expect(cleared.rotationDay).toBeNull()
  })

  it('deletes a squad and confirms removal', async () => {
    const response = await authDelete(baseUrl, `/api/teams/${teamId}/squads/${squadId}`, cookie)
    expect(response.status).toBe(200)

    // Verify the squad is gone
    const squadsResponse = await authGet(baseUrl, `/api/teams/${teamId}/squads`, cookie)
    const squads = await squadsResponse.json()
    const found = squads.find((squad: { id: string }) => squad.id === squadId)
    expect(found).toBeUndefined()
  })
})
