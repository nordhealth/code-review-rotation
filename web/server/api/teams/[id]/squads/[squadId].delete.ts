defineRouteMeta({
  openAPI: {
    summary: 'Delete a squad',
    tags: ['Squads'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'squadId',
        in: 'path',
        required: true,
        description: 'Squad ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Squad deleted successfully',
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
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const squadId = getRouterParam(event, 'squadId')!
  await deleteSquad(squadId)
  return { success: true }
})
