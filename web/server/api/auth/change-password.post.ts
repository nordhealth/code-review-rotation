import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1, { error: 'Current password is required' }),
  newPassword: z.string().min(8, { error: 'New password must be at least 8 characters' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Change password for authenticated user',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['currentPassword', 'newPassword'],
            properties: {
              currentPassword: { type: 'string', minLength: 1 },
              newPassword: { type: 'string', minLength: 8 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password changed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
      401: { description: 'Current password is incorrect' },
      404: { description: 'User not found' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const sessionUser = await requireAuth(event)
  const body = await readValidatedBody(event, schema.parse)

  const user = await queryUserByEmail(sessionUser.email)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await verifyPassword(user.passwordHash, body.currentPassword)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Current password is incorrect',
    })
  }

  const newHash = await hashPassword(body.newPassword)
  await updateUserPassword(user.id, newHash)

  return { message: 'Password changed successfully' }
})
