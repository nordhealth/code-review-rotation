export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const team = await resolveTeam(id)
  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }
  return team
})
