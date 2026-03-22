import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  defaultReviewerCount: z.number().int().positive().optional(),
  rotationIntervalDays: z.number().int().min(1).max(90).nullable().optional(),
  rotationDay: z.enum(ROTATION_DAYS).nullable().optional(),
  rotationTimezone: z.string().min(1).nullable().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a team',
    tags: ['Teams'],
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
              defaultReviewerCount: { type: 'integer', minimum: 1 },
              rotationIntervalDays: { type: 'integer', minimum: 1, maximum: 90, nullable: true },
              rotationDay: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], nullable: true },
              rotationTimezone: { type: 'string', minLength: 1, nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The updated team',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
                defaultReviewerCount: { type: 'integer' },
                rotationIntervalDays: { type: 'integer', nullable: true },
                rotationDay: { type: 'string', nullable: true },
                rotationTimezone: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'name', 'slug', 'defaultReviewerCount', 'createdAt', 'updatedAt'],
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
  const resolved = await resolveTeam(slugOrId)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }
  const body = await readValidatedBody(event, schema.parse)
  const team = await updateTeam(resolved.id, body)
  return team
})
