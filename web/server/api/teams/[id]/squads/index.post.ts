import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  reviewerCount: z.number().int().positive(),
  memberDeveloperIds: z.array(z.string()),
  rotationIntervalDays: z.number().int().positive().nullable().optional(),
  rotationDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).nullable().optional(),
  rotationTimezone: z.string().nullable().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Create a squad for a team',
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
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              reviewerCount: { type: 'integer', minimum: 1 },
              memberDeveloperIds: { type: 'array', items: { type: 'string' } },
              rotationIntervalDays: { type: 'integer', minimum: 1, nullable: true, description: 'Override team rotation interval (days)' },
              rotationDay: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], nullable: true, description: 'Override team rotation day' },
              rotationTimezone: { type: 'string', nullable: true, description: 'Override team rotation timezone' },
            },
            required: ['name', 'reviewerCount', 'memberDeveloperIds'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The created squad',
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
              },
              required: ['id', 'teamId', 'name', 'reviewerCount', 'createdAt'],
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
  return createSquad({ teamId: team.id, ...body })
})
