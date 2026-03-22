import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authGet, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('developer profile (regression)', () => {
  let baseUrl: string
  let cookie: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('gets a seed developer by slug with all fields', async () => {
    const response = await authGet(baseUrl, '/api/developers/joao-goncalves', cookie)
    expect(response.status).toBe(200)
    const dev = await response.json()
    expect(dev.firstName).toBe('João')
    expect(dev.lastName).toBe('Gonçalves')
    expect(dev.slug).toBe('joao-goncalves')
    expect(typeof dev.id).toBe('string')
    expect(typeof dev.slackId).toBe('string')
    expect(typeof dev.gitlabId).toBe('string')
    expect(typeof dev.githubId).toBe('string')
  })

  it('returns 404 for non-existent developer', async () => {
    const response = await authGet(baseUrl, '/api/developers/nonexistent-dev', cookie)
    expect(response.status).toBe(404)
  })

  it('rejects unauthenticated access to developer profile', async () => {
    const response = await fetch(`${baseUrl}/api/developers/joao-goncalves`)
    expect(response.status).toBe(401)
  })

  it('includes team memberships in associations', async () => {
    const response = await authGet(baseUrl, '/api/developers/joao-goncalves/associations', cookie)
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(Array.isArray(data.memberOf)).toBe(true)
    expect(data.memberOf.length).toBeGreaterThan(0)

    const membership = data.memberOf[0]
    expect(typeof membership.teamId).toBe('string')
    expect(typeof membership.teamName).toBe('string')
    expect(typeof membership.teamSlug).toBe('string')
    expect(typeof membership.isExperienced).toBe('boolean')
  })

  it('includes rotation assignments with full structure', async () => {
    const response = await authGet(baseUrl, '/api/developers/joao-goncalves/associations', cookie)
    const data = await response.json()

    expect(Array.isArray(data.assignedToMe)).toBe(true)
    expect(data.assignedToMe.length).toBeGreaterThan(0)

    const assignment = data.assignedToMe[0]
    expect(typeof assignment.rotationId).toBe('string')
    expect(assignment).toHaveProperty('date')
    expect(typeof assignment.mode).toBe('string')
    expect(typeof assignment.teamName).toBe('string')
    expect(typeof assignment.teamSlug).toBe('string')
  })

  it('includes reviewing-others data', async () => {
    const response = await authGet(baseUrl, '/api/developers/joao-goncalves/associations', cookie)
    const data = await response.json()

    expect(Array.isArray(data.reviewingOthers)).toBe(true)
    expect(data.reviewingOthers.length).toBeGreaterThan(0)

    const review = data.reviewingOthers[0]
    expect(typeof review.rotationId).toBe('string')
    expect(typeof review.targetId).toBe('string')
    expect(typeof review.mode).toBe('string')
  })

  it('includes squad memberships for squad members', async () => {
    // Cuong is in the Bug Sheriff squad from seed data
    const response = await authGet(baseUrl, '/api/developers/cuong-nguyen/associations', cookie)
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(Array.isArray(data.memberOfSquads)).toBe(true)
    expect(data.memberOfSquads.length).toBeGreaterThan(0)

    const squad = data.memberOfSquads[0]
    expect(typeof squad.squadName).toBe('string')
    expect(typeof squad.squadId).toBe('string')
    expect(typeof squad.teamId).toBe('string')
  })
})
