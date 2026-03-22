defineRouteMeta({
  openAPI: {
    summary: 'Get a squad by ID',
    tags: ['Squads'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'squadId',
        in: 'path',
        required: true,
        description: 'Squad ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'The squad with its members',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                teamId: { type: 'string' },
                name: { type: 'string' },
                reviewerCount: { type: 'integer' },
                createdAt: { type: 'string', format: 'date-time' },
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      developer: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          firstName: { type: 'string' },
                          lastName: { type: 'string' },
                          slackId: { type: 'string', nullable: true },
                          gitlabId: { type: 'string', nullable: true },
                        },
                        required: ['id', 'firstName', 'lastName'],
                      },
                    },
                    required: ['id', 'developer'],
                  },
                },
              },
              required: ['id', 'teamId', 'name', 'reviewerCount', 'createdAt', 'members'],
            },
          },
        },
      },
      404: {
        description: 'Squad not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const squadId = getRouterParam(event, 'squadId')!
  const squad = await querySquadById(squadId)
  if (!squad) {
    throw createError({ statusCode: 404, statusMessage: 'Squad not found' })
  }
  return squad
})
