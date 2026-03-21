import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  defaultReviewerCount: z.number().int().positive().optional(),
  rotationIntervalDays: z.number().int().min(1).max(90).nullable().optional(),
  rotationDay: z.enum(ROTATION_DAYS).nullable().optional(),
  rotationTimezone: z.string().min(1).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  return createTeam(body)
})
