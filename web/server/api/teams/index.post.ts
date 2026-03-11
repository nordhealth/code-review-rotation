import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  defaultReviewerCount: z.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  return createTeam(body)
})
