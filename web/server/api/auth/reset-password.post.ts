import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1, { error: 'Reset token is required' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Reset password using a reset token',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token', 'password'],
            properties: {
              token: { type: 'string', minLength: 1 },
              password: { type: 'string', minLength: 8 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password updated',
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
      400: { description: 'Invalid or expired reset token' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const user = await queryUserByResetToken(body.token)
  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired reset token',
    })
  }

  if (user.resetPasswordTokenExpiresAt && new Date() > user.resetPasswordTokenExpiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Reset token has expired. Please request a new one.',
    })
  }

  const newHash = await hashPassword(body.password)
  await updateUserPassword(user.id, newHash)

  return { message: 'Password updated successfully. You can now sign in.' }
})
