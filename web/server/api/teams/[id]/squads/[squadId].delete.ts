export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const squadId = getRouterParam(event, 'squadId')!
  await deleteSquad(squadId)
  return { success: true }
})
