defineRouteMeta({
  openAPI: {
    summary: 'Delete an API key',
    tags: ['API Keys'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
        description: 'API key ID',
      },
    ],
    responses: {
      200: {
        description: 'Key deleted',
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
      401: { description: 'Unauthorized' },
      404: { description: 'API key not found' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!

  const userKeys = await queryApiKeysByUserId(user.id)
  const keyBelongsToUser = userKeys.some(key => key.id === id)

  if (!keyBelongsToUser) {
    throw createError({ statusCode: 404, statusMessage: 'API key not found' })
  }

  await deleteApiKey(id, user.id)
  return { ok: true }
})
