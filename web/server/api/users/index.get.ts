defineRouteMeta({
  openAPI: {
    summary: 'List all users',
    tags: ['Users'],
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'developer'] },
                  emailConfirmed: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Admin access required' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return queryAllUsers()
})
