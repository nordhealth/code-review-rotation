defineRouteMeta({
  openAPI: {
    summary: 'Remove a member from a team',
    tags: ['Team Members'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'memberId',
        in: 'path',
        required: true,
        description: 'Team member ID',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Member removed successfully',
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
  const memberId = getRouterParam(event, 'memberId')!
  await removeTeamMember(memberId)
  return { success: true }
})
