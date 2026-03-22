defineRouteMeta({
  openAPI: {
    summary: 'Get a team by slug or ID',
    tags: ['Teams'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'The team',
        content: {
          'application/json': {
            schema: {
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
              },
              required: ['id', 'name', 'slug', 'defaultReviewerCount', 'createdAt', 'updatedAt'],
            },
          },
        },
      },
      404: {
        description: 'Team not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const team = await resolveTeam(id)
  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }
  return team
})
