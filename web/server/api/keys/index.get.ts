defineRouteMeta({
  openAPI: {
    summary: 'List API keys for the authenticated user',
    tags: ['API Keys'],
    responses: {
      200: {
        description: 'List of API keys',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  keyPrefix: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
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
  return queryApiKeysByUserId(user.id)
})
