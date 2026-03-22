defineRouteMeta({
  openAPI: {
    summary: 'Get rotation associations for a developer',
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
        description: 'Developer rotation associations including reviews assigned to them, reviews they perform, team memberships, and squad memberships',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                assignedToMe: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      assignmentId: { type: 'string' },
                      rotationId: { type: 'string' },
                      targetName: { type: 'string' },
                      date: { type: 'string', format: 'date-time' },
                      mode: { type: 'string' },
                      teamId: { type: 'string' },
                      teamName: { type: 'string' },
                      teamSlug: { type: 'string' },
                      reviewerId: { type: 'string', nullable: true },
                      reviewerName: { type: 'string' },
                      reviewerFirstName: { type: 'string', nullable: true },
                      reviewerLastName: { type: 'string', nullable: true },
                      reviewerSlug: { type: 'string', nullable: true },
                    },
                  },
                },
                reviewingOthers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      assignmentId: { type: 'string' },
                      rotationId: { type: 'string' },
                      targetId: { type: 'string', nullable: true },
                      targetName: { type: 'string' },
                      targetType: { type: 'string' },
                      targetSlug: { type: 'string', nullable: true },
                      date: { type: 'string', format: 'date-time' },
                      mode: { type: 'string' },
                      teamId: { type: 'string' },
                      teamName: { type: 'string' },
                      teamSlug: { type: 'string' },
                    },
                  },
                },
                memberOf: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      teamId: { type: 'string' },
                      teamName: { type: 'string' },
                      teamSlug: { type: 'string' },
                      isExperienced: { type: 'boolean' },
                    },
                  },
                },
                memberOfSquads: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      squadId: { type: 'string' },
                      squadName: { type: 'string' },
                      teamId: { type: 'string' },
                      reviewerCount: { type: 'integer' },
                    },
                  },
                },
              },
              required: ['assignedToMe', 'reviewingOthers', 'memberOf', 'memberOfSquads'],
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
  const slugOrId = getRouterParam(event, 'id')!
  const developer = await resolveDeveloper(slugOrId)
  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  return queryDeveloperAssociations(developer.id)
})
