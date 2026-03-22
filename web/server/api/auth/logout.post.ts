defineRouteMeta({
  openAPI: {
    summary: 'Sign out and clear session',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Logged out',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
