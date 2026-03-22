import { z } from 'zod'

const updateUserSchema = z.object({
  role: z.enum(['admin', 'developer']),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a user role',
    tags: ['Users'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
        description: 'User ID',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['role'],
            properties: {
              role: { type: 'string', enum: ['admin', 'developer'] },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Updated user',
        content: {
          'application/json': {
            schema: {
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
      400: { description: 'Cannot change own role' },
      401: { description: 'Unauthorized' },
      403: { description: 'Admin access required' },
      404: { description: 'User not found' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateUserSchema.parse)

  if (id === currentUser.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot change your own role',
    })
  }

  const updated = await updateUserRole(id, body.role)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  return updated
})
