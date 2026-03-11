import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  reviewerCount: z.number().int().positive().optional(),
  memberDeveloperIds: z.array(z.string()).optional(),
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
