defineRouteMeta({
  openAPI: {
    summary: 'List all developers',
    tags: ['Developers'],
    responses: {
      200: {
        description: 'List of developers ordered by first name',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
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
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return queryDevelopers()
})
