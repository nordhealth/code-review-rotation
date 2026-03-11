export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const team = await resolveTeam(slugOrId)
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 20
  const offset = query.offset ? Number(query.offset) : 0
  return queryRotations(team.id, { limit, offset })
})
