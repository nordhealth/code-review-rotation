defineRouteMeta({
  openAPI: {
    summary: 'Delete a team',
    tags: ['Teams'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Team deleted successfully',
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
        description: 'Team not found',
      },
    },
  },
})

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
