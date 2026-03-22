defineRouteMeta({
  openAPI: {
    summary: 'Get a developer by ID or slug',
    tags: ['Developers'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Developer ID or slug',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'The requested developer',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                slug: { type: 'string' },
                slackId: { type: 'string', nullable: true },
                gitlabId: { type: 'string', nullable: true },
                githubId: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'firstName', 'lastName', 'slug', 'createdAt', 'updatedAt'],
            },
          },
        },
      },
      404: {
        description: 'Developer not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const developer = await resolveDeveloper(id)
  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  return developer
})
