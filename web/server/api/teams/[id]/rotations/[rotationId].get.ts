export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const rotationId = getRouterParam(event, 'rotationId')!
  const team = await resolveTeam(slugOrId)
  if (!team)
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const rotationsResult = await queryRotations(team.id, { limit: 1000, offset: 0 })
  const rotation = rotationsResult.find(r => r.id === rotationId)

  if (!rotation) {
    throw createError({ statusCode: 404, statusMessage: 'Rotation not found' })
  }

  return rotation
})
