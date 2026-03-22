defineRouteMeta({
  openAPI: {
    summary: 'Get a rotation by ID',
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
        name: 'rotationId',
        in: 'path',
        required: true,
        description: 'Rotation ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'The rotation with assignments and reviewers',
        content: {
          'application/json': {
            schema: {
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
      404: {
        description: 'Team or rotation not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const rotationId = getRouterParam(event, 'rotationId')!
  const team = await resolveTeam(slugOrId)
  if (!team)
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const rotationsResult = await queryRotations(team.id, { limit: 1000, offset: 0 })
  const rotation = rotationsResult.find(r => r.id === rotationId)

  if (!rotation) {
    throw createError({ statusCode: 404, statusMessage: 'Rotation not found' })
  }

  return rotation
})
