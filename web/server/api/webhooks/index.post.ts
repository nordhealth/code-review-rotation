import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Create a new webhook',
    tags: ['Webhooks'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'url'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 100 },
              url: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Created webhook with secret shown once',
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
  const body = await readValidatedBody(event, schema.parse)
  return createWebhook(body)
})
