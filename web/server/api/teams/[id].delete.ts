export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const resolved = await resolveTeam(slugOrId)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }
  await deleteTeam(resolved.id)
  return { success: true }
})
