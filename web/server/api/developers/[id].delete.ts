export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const existing = await resolveDeveloper(slugOrId)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  await deleteDeveloper(existing.id)
  return { success: true }
})
