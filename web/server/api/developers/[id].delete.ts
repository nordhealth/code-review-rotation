defineRouteMeta({
  openAPI: {
    summary: 'Delete a developer by ID or slug',
    tags: ['Developers'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Developer ID or slug',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Deletion confirmation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
              },
              required: ['success'],
            },
          },
        },
      },
      404: {
        description: 'Developer not found',
      },
    },
  },
})

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
