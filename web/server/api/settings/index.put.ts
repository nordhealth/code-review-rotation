import { z } from 'zod'

const schema = z.object({
  defaultRotationIntervalDays: z.number().int().min(1).max(90).optional(),
  defaultRotationDay: z.enum(ROTATION_DAYS).optional(),
  defaultRotationTimezone: z.string().min(1).optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update global settings',
    tags: ['Settings'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              defaultRotationIntervalDays: { type: 'integer', minimum: 1, maximum: 90 },
              defaultRotationDay: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
              defaultRotationTimezone: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Updated settings object',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                defaultRotationIntervalDays: { type: 'integer' },
                defaultRotationDay: { type: 'string' },
                defaultRotationTimezone: { type: 'string' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Admin access required' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  return updateSettings(body)
})
