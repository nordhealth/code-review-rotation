import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  defaultReviewerCount: z.number().int().positive().optional(),
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
