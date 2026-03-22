import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authDelete, authGet, authPost, authPut, loginAsAdmin } from '../helpers'
import { startServer, stopServer } from '../setup'

const isE2E = process.env.TEST_E2E === 'true'
const RUN = Date.now()

describe.skipIf(!isE2E)('settings and webhooks (regression)', () => {
  let baseUrl: string
  let cookie: string
  let webhookId: string

  beforeAll(async () => {
    baseUrl = await startServer()
    cookie = await loginAsAdmin(baseUrl)
  }, 20000)

  afterAll(() => {
    stopServer()
  })

  // Global settings
  it('gets global settings', async () => {
    const response = await authGet(baseUrl, '/api/settings', cookie)
    expect(response.status).toBe(200)
    const settings = await response.json()
    expect(settings.defaultRotationIntervalDays).toBe(14)
    expect(settings.defaultRotationDay).toBe('wednesday')
    expect(settings.defaultRotationTimezone).toBe('Europe/Helsinki')
  })

  it('updates global settings', async () => {
    const response = await authPut(baseUrl, '/api/settings', cookie, {
      defaultRotationIntervalDays: 7,
      defaultRotationDay: 'monday',
    })
    expect(response.status).toBe(200)
    const settings = await response.json()
    expect(settings.defaultRotationIntervalDays).toBe(7)
    expect(settings.defaultRotationDay).toBe('monday')
    // Timezone should not be affected
    expect(settings.defaultRotationTimezone).toBe('Europe/Helsinki')
  })

  it('restores global settings', async () => {
    const response = await authPut(baseUrl, '/api/settings', cookie, {
      defaultRotationIntervalDays: 14,
      defaultRotationDay: 'wednesday',
    })
    expect(response.status).toBe(200)
    const settings = await response.json()
    expect(settings.defaultRotationIntervalDays).toBe(14)
    expect(settings.defaultRotationDay).toBe('wednesday')
  })

  it('rejects invalid interval', async () => {
    const response = await authPut(baseUrl, '/api/settings', cookie, {
      defaultRotationIntervalDays: 0,
    })
    expect(response.status).toBe(400)
  })

  // Team schedule overrides
  it('sets team schedule override', async () => {
    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    const teamSlug = teams[0].slug

    const response = await authPut(baseUrl, `/api/teams/${teamSlug}`, cookie, {
      rotationIntervalDays: 7,
      rotationDay: 'friday',
    })
    expect(response.status).toBe(200)
    const team = await response.json()
    expect(team.rotationIntervalDays).toBe(7)
    expect(team.rotationDay).toBe('friday')
  })

  it('clears team schedule override', async () => {
    const teamsResponse = await authGet(baseUrl, '/api/teams', cookie)
    const teams = await teamsResponse.json()
    const teamSlug = teams[0].slug

    const response = await authPut(baseUrl, `/api/teams/${teamSlug}`, cookie, {
      rotationIntervalDays: null,
      rotationDay: null,
    })
    expect(response.status).toBe(200)
    const team = await response.json()
    expect(team.rotationIntervalDays).toBeNull()
    expect(team.rotationDay).toBeNull()
  })

  // Webhooks
  it('creates a webhook', async () => {
    const response = await authPost(baseUrl, '/api/webhooks', cookie, {
      name: `Webhook${RUN}`,
      url: 'https://example.com/hook',
    })
    expect(response.status).toBe(200)
    const webhook = await response.json()
    expect(webhook.name).toBe(`Webhook${RUN}`)
    expect(typeof webhook.secret).toBe('string')
    expect(webhook.secret.length).toBe(64)
    expect(webhook.active).toBe(true)
    webhookId = webhook.id
  })

  it('lists webhooks without exposing secrets', async () => {
    const response = await authGet(baseUrl, '/api/webhooks', cookie)
    expect(response.status).toBe(200)
    const webhooks = await response.json()
    expect(webhooks.length).toBeGreaterThan(0)

    // Find our webhook by ID (not by index)
    const ours = webhooks.find((webhook: { id: string }) => webhook.id === webhookId)
    expect(ours).toBeDefined()
    expect(ours.name).toBe(`Webhook${RUN}`)
    expect(ours).not.toHaveProperty('secret')
  })

  it('toggles webhook active state', async () => {
    const response = await authPut(baseUrl, `/api/webhooks/${webhookId}`, cookie, {
      active: false,
    })
    expect(response.status).toBe(200)
    const webhook = await response.json()
    expect(webhook.active).toBe(false)
  })

  it('deletes a webhook and confirms removal', async () => {
    const response = await authDelete(baseUrl, `/api/webhooks/${webhookId}`, cookie)
    expect(response.status).toBe(200)

    const afterResponse = await authGet(baseUrl, '/api/webhooks', cookie)
    const remaining = await afterResponse.json()
    const found = remaining.find((webhook: { id: string }) => webhook.id === webhookId)
    expect(found).toBeUndefined()
  })
})
