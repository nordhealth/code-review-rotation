export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const memberId = getRouterParam(event, 'memberId')!
  await removeTeamMember(memberId)
  return { success: true }
})
