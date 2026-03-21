export default defineEventHandler(async (event) => {
  const squadId = getRouterParam(event, 'squadId')!
  const squad = await querySquadById(squadId)
  if (!squad) {
    throw createError({ statusCode: 404, statusMessage: 'Squad not found' })
  }
  return squad
})
