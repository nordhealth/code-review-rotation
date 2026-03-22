import { z } from 'zod'

const schema = z.object({
  active: z.boolean(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Toggle webhook active status',
    tags: ['Webhooks'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
        description: 'Webhook ID',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['active'],
            properties: {
              active: { type: 'boolean' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Updated webhook',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                active: { type: 'boolean' },
                events: { type: 'string' },
                secret: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Admin access required' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  return updateWebhookActive(id, body.active)
})
