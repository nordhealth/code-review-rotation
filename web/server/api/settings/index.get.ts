defineRouteMeta({
  openAPI: {
    summary: 'Get global settings',
    tags: ['Settings'],
    responses: {
      200: {
        description: 'Global settings object',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                defaultRotationIntervalDays: { type: 'integer' },
                defaultRotationDay: { type: 'string' },
                defaultRotationTimezone: { type: 'string' },
                updatedAt: { type: 'string', format: 'date-time' },
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
  return querySettings()
})
