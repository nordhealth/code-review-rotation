import { z } from 'zod'

const schema = z.object({
  mode: z.enum(['devs', 'teams']),
  isManual: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const team = await resolveTeam(slugOrId)
  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Run rotation algorithm via orchestrator
  const rawAssignments
    = body.mode === 'devs'
      ? await executeDevRotation(team.id)
      : await executeTeamRotation(team.id)

  // Persist results
  const rotation = await createRotation({
    teamId: team.id,
    date: new Date(),
    isManual: body.isManual,
    mode: body.mode,
    assignments: rawAssignments.map(a => ({
      targetType: body.mode === 'devs' ? 'developer' as const : 'squad' as const,
      targetId: a.targetId,
      reviewerDeveloperIds: a.reviewerIds,
    })),
  })

  // Return the created rotation with full details
  const rotations = await queryRotations(team.id, { limit: 1, offset: 0 })
  return rotations[0] ?? rotation
})
