import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
})

defineRouteMeta({
  openAPI: {
    summary: 'Create a new API key',
    tags: ['API Keys'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 100 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Created API key with plain key shown once',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                keyPrefix: { type: 'string' },
                keyHash: { type: 'string' },
                userId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                plainKey: { type: 'string' },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, schema.parse)
  return createApiKey(user.id, body.name)
})
