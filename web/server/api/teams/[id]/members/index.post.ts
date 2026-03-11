import { z } from 'zod'

const schema = z.object({
  developerId: z.string().min(1),
  reviewerCount: z.number().int().positive().optional(),
  isExperienced: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const team = await resolveTeam(slugOrId)
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  const body = await readValidatedBody(event, schema.parse)
  return addTeamMember({ teamId: team.id, ...body })
})
