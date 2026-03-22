defineRouteMeta({
  openAPI: {
    summary: 'List all teams',
    tags: ['Teams'],
    responses: {
      200: {
        description: 'List of teams with member counts',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  defaultReviewerCount: { type: 'integer' },
                  rotationIntervalDays: { type: 'integer', nullable: true },
                  rotationDay: { type: 'string', nullable: true },
                  rotationTimezone: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  memberCount: { type: 'integer' },
                },
                required: ['id', 'name', 'slug', 'defaultReviewerCount', 'createdAt', 'updatedAt', 'memberCount'],
              },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return queryTeams()
})
