defineRouteMeta({
  openAPI: {
    summary: 'List rotations for a team',
    tags: ['Rotations'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        description: 'Maximum number of rotations to return (default: 20)',
        schema: { type: 'integer', default: 20 },
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        description: 'Number of rotations to skip (default: 0)',
        schema: { type: 'integer', default: 0 },
      },
    ],
    responses: {
      200: {
        description: 'Paginated list of rotations with assignments and reviewers',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  teamId: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  isManual: { type: 'boolean' },
                  mode: { type: 'string', enum: ['devs', 'teams'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  assignments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        rotationId: { type: 'string' },
                        targetType: { type: 'string', enum: ['developer', 'squad'] },
                        targetId: { type: 'string' },
                        targetName: { type: 'string' },
                        targetSlug: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        reviewers: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              assignmentId: { type: 'string' },
                              reviewerDeveloperId: { type: 'string', nullable: true },
                              reviewerName: { type: 'string', nullable: true },
                              developer: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  firstName: { type: 'string' },
                                  lastName: { type: 'string' },
                                  slug: { type: 'string', nullable: true },
                                  slackId: { type: 'string', nullable: true },
                                  gitlabId: { type: 'string', nullable: true },
                                },
                                required: ['id', 'firstName', 'lastName'],
                              },
                            },
                            required: ['id', 'assignmentId', 'developer'],
                          },
                        },
                      },
                      required: ['id', 'rotationId', 'targetType', 'targetId', 'targetName', 'createdAt', 'reviewers'],
                    },
                  },
                },
                required: ['id', 'teamId', 'date', 'isManual', 'mode', 'createdAt', 'assignments'],
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
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 20
  const offset = query.offset ? Number(query.offset) : 0
  return queryRotations(team.id, { limit, offset })
})
