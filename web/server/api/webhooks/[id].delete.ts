defineRouteMeta({
  openAPI: {
    summary: 'Delete a webhook',
    tags: ['Webhooks'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
        description: 'Webhook ID',
      },
    ],
    responses: {
      200: {
        description: 'Webhook deleted',
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
      403: { description: 'Admin access required' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  await deleteWebhook(id)
  return { ok: true }
})
