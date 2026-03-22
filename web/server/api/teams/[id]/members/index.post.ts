import { z } from 'zod'

const schema = z.object({
  developerId: z.string().min(1),
  reviewerCount: z.number().int().positive().optional(),
  isExperienced: z.boolean().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Add a member to a team',
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
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              developerId: { type: 'string', minLength: 1 },
              reviewerCount: { type: 'integer', minimum: 1 },
              isExperienced: { type: 'boolean' },
            },
            required: ['developerId'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The created team member',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                teamId: { type: 'string' },
                developerId: { type: 'string' },
                reviewerCount: { type: 'integer', nullable: true },
                isExperienced: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'teamId', 'developerId', 'isExperienced', 'createdAt'],
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
  const team = await resolveTeam(slugOrId)
  if (!team)
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  const body = await readValidatedBody(event, schema.parse)
  return addTeamMember({ teamId: team.id, ...body })
})
