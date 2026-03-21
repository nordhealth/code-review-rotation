export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const team = await resolveTeam(slugOrId)
  if (!team)
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  return queryTeamMembers(team.id)
})
