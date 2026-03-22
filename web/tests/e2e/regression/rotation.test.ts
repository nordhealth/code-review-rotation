import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authGet, authPost, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('rotation execution (regression)', () => {
  let baseUrl: string
  let cookie: string
  let teamId: string
  let initialRotationCount: number

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    teamId = teams[0].id

    // Capture initial count for relative comparison later
    const rotResponse = await authGet(baseUrl, `/api/teams/${teamId}/rotations`, cookie)
    const rotations = await rotResponse.json()
    initialRotationCount = rotations.length
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('lists rotations for a team', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamId}/rotations`, cookie)
    expect(response.status).toBe(200)
    const rotations = await response.json()
    expect(Array.isArray(rotations)).toBe(true)
    expect(rotations.length).toBeGreaterThan(0)
    expect(typeof rotations[0].id).toBe('string')
    expect(rotations[0]).toHaveProperty('mode')
    expect(rotations[0]).toHaveProperty('date')
    expect(Array.isArray(rotations[0].assignments)).toBe(true)
  })

  it('runs a developer rotation', async () => {
    const response = await authPost(baseUrl, `/api/teams/${teamId}/rotations`, cookie, {
      mode: 'devs',
      isManual: true,
    })
    expect(response.status).toBe(200)
    const rotation = await response.json()
    expect(rotation.mode).toBe('devs')
    expect(rotation.isManual).toBe(true)
    expect(rotation.teamId).toBe(teamId)
    expect(rotation.assignments.length).toBeGreaterThan(0)

    for (const assignment of rotation.assignments) {
      expect(assignment.targetType).toBe('developer')
      expect(typeof assignment.targetId).toBe('string')
      expect(typeof assignment.targetName).toBe('string')
      expect(assignment.reviewers.length).toBeGreaterThan(0)
    }
  })

  it('runs a team/squad rotation', async () => {
    const response = await authPost(baseUrl, `/api/teams/${teamId}/rotations`, cookie, {
      mode: 'teams',
      isManual: true,
    })
    expect(response.status).toBe(200)
    const rotation = await response.json()
    expect(rotation.mode).toBe('teams')
    expect(rotation.isManual).toBe(true)
    expect(rotation.assignments.length).toBeGreaterThan(0)

    for (const assignment of rotation.assignments) {
      expect(assignment.targetType).toBe('squad')
      expect(typeof assignment.targetId).toBe('string')
      expect(assignment.reviewers.length).toBeGreaterThan(0)
    }
  })

  it('verifies new rotations appear in history', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamId}/rotations`, cookie)
    const rotations = await response.json()

    // Should have at least as many rotations as before (may be capped by page limit)
    expect(rotations.length).toBeGreaterThanOrEqual(initialRotationCount)

    // Latest rotation should be manual (one we just created)
    const latest = rotations[0]
    expect(latest.isManual).toBe(true)
    expect(['devs', 'teams']).toContain(latest.mode)
  })
})
