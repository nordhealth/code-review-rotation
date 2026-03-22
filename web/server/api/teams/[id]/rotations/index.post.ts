import { z } from 'zod'

const schema = z.object({
  mode: z.enum(['devs', 'teams']),
  isManual: z.boolean().optional().default(false),
})

defineRouteMeta({
  openAPI: {
    summary: 'Run a new rotation for a team',
    tags: ['Rotations'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['devs', 'teams'] },
              isManual: { type: 'boolean', default: false },
            },
            required: ['mode'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The created rotation with assignments and reviewers',
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
              required: ['id', 'teamId', 'date', 'isManual', 'mode', 'createdAt'],
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
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const team = await resolveTeam(slugOrId)
  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Run rotation algorithm via orchestrator
  const rawAssignments
    = body.mode === 'devs'
      ? await executeDevRotation(team.id)
      : await executeTeamRotation(team.id)

  // Persist results
  const rotation = await createRotation({
    teamId: team.id,
    date: new Date(),
    isManual: body.isManual,
    mode: body.mode,
    assignments: rawAssignments.map(a => ({
      targetType: body.mode === 'devs' ? 'developer' as const : 'squad' as const,
      targetId: a.targetId,
      reviewerDeveloperIds: a.reviewerIds,
    })),
  })

  // Return the created rotation with full details
  const rotations = await queryRotations(team.id, { limit: 5, offset: 0 })
  return rotations.find(r => r.id === rotation.id) ?? rotation
})
