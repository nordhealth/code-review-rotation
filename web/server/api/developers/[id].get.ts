export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const developer = await resolveDeveloper(id)
  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  return developer
})
