export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const slugOrId = getRouterParam(event, 'id')!
  const developer = await resolveDeveloper(slugOrId)
  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  return queryDeveloperAssociations(developer.id)
})
