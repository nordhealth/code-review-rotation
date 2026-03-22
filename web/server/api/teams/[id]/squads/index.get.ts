defineRouteMeta({
  openAPI: {
    summary: 'List squads for a team',
    tags: ['Squads'],
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
        description: 'List of squads with their members',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
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
      },
      404: {
        description: 'Team not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const team = await resolveTeam(slugOrId)
  if (!team)
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  return querySquads(team.id)
})
