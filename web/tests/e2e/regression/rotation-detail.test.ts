import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'

describe.skipIf(!isE2E)('rotation detail and assignments (regression)', () => {
  let baseUrl: string
  let cookie: string
  let teamSlug: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)

    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    teamSlug = teams[0].slug
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  it('gets a single rotation by ID with full structure', async () => {
    const listResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/rotations`, cookie)
    const rotations = await listResponse.json()
    expect(rotations.length).toBeGreaterThan(0)

    const rotationId = rotations[0].id
    const response = await authGet(baseUrl, `/api/teams/${teamSlug}/rotations/${rotationId}`, cookie)
    expect(response.status).toBe(200)
    const rotation = await response.json()
    expect(rotation.id).toBe(rotationId)
    expect(rotation).toHaveProperty('mode')
    expect(rotation).toHaveProperty('date')
    expect(Array.isArray(rotation.assignments)).toBe(true)
    expect(rotation.assignments.length).toBeGreaterThan(0)

    const assignment = rotation.assignments[0]
    expect(assignment).toHaveProperty('targetType')
    expect(assignment).toHaveProperty('targetId')
    expect(assignment).toHaveProperty('targetName')
    expect(Array.isArray(assignment.reviewers)).toBe(true)
  })

  it('returns 404 for non-existent rotation', async () => {
    const response = await authGet(baseUrl, `/api/teams/${teamSlug}/rotations/nonexistent-id`, cookie)
    expect(response.status).toBe(404)
  })

  it('edits rotation assignment reviewers and verifies persistence', async () => {
    // Create a fresh rotation
    const rotateResponse = await authPost(baseUrl, `/api/teams/${teamSlug}/rotations`, cookie, {
      mode: 'devs',
      isManual: true,
    })
    expect(rotateResponse.status).toBe(200)
    const rotation = await rotateResponse.json()
    const assignmentId = rotation.assignments[0].id
    const rotationId = rotation.id

    // Pick 2 different reviewers
    const membersResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/members`, cookie)
    const members = await membersResponse.json()
    const newReviewerIds = members.slice(0, 2).map((member: { developerId: string }) => member.developerId)

    // Edit the assignment
    const editResponse = await authPut(
      baseUrl,
      `/api/teams/${teamSlug}/rotations/${rotationId}/assignments/${assignmentId}`,
      cookie,
      { reviewerDeveloperIds: newReviewerIds },
    )
    expect(editResponse.status).toBe(200)
    const editData = await editResponse.json()
    expect(editData.ok).toBe(true)

    // Verify the edit persisted by re-fetching the rotation
    const verifyResponse = await authGet(baseUrl, `/api/teams/${teamSlug}/rotations/${rotationId}`, cookie)
    const updatedRotation = await verifyResponse.json()
    const updatedAssignment = updatedRotation.assignments.find(
      (assignment: { id: string }) => assignment.id === assignmentId,
    )
    expect(updatedAssignment).toBeDefined()
    const updatedReviewerIds = updatedAssignment.reviewers.map(
      (reviewer: { developer: { id: string } }) => reviewer.developer.id,
    )
    expect(updatedReviewerIds.sort()).toEqual(newReviewerIds.sort())
  })

  it('rejects legacy rotate endpoint without API key', async () => {
    const response = await fetch(`${baseUrl}/api/rotate`, { method: 'POST' })
    expect(response.status).toBe(401)
  })

  it('rejects legacy rotate endpoint with wrong API key', async () => {
    const response = await fetch(`${baseUrl}/api/rotate`, {
      method: 'POST',
      headers: { 'x-api-key': 'wrong-key' },
    })
    expect(response.status).toBe(401)
  })
})
