defineRouteMeta({
  openAPI: {
    summary: 'List team members',
    tags: ['Team Members'],
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
        description: 'List of team members with developer details and preferable reviewers',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  teamId: { type: 'string' },
                  developerId: { type: 'string' },
                  reviewerCount: { type: 'integer', nullable: true },
                  isExperienced: { type: 'boolean' },
                  developer: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      slug: { type: 'string' },
                      slackId: { type: 'string', nullable: true },
                      gitlabId: { type: 'string', nullable: true },
                    },
                    required: ['id', 'firstName', 'lastName', 'slug'],
                  },
                  preferableReviewers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        preferredDeveloperId: { type: 'string' },
                      },
                      required: ['id', 'preferredDeveloperId'],
                    },
                  },
                },
                required: ['id', 'teamId', 'developerId', 'isExperienced', 'developer', 'preferableReviewers'],
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
  return queryTeamMembers(team.id)
})
