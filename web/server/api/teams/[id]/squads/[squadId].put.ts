import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  reviewerCount: z.number().int().positive().optional(),
  memberDeveloperIds: z.array(z.string()).optional(),
  rotationIntervalDays: z.number().int().positive().nullable().optional(),
  rotationDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).nullable().optional(),
  rotationTimezone: z.string().nullable().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a squad',
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
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The updated squad',
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
        description: 'Squad not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const squadId = getRouterParam(event, 'squadId')!
  const body = await readValidatedBody(event, schema.parse)
  const squad = await updateSquad(squadId, body)
  if (!squad) {
    throw createError({ statusCode: 404, statusMessage: 'Squad not found' })
  }
  return squad
})
