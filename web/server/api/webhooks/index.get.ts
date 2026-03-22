defineRouteMeta({
  openAPI: {
    summary: 'List all webhooks (secrets excluded)',
    tags: ['Webhooks'],
    responses: {
      200: {
        description: 'List of webhooks without secrets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  active: { type: 'boolean' },
                  events: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
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
  const allWebhooks = await queryWebhooks()
  return allWebhooks.map(({ secret, ...rest }) => rest)
})
