import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  reviewerCount: z.number().int().positive(),
  memberDeveloperIds: z.array(z.string()),
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
